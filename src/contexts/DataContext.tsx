import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { ParsedData, Piece, Settings, Filters, KPIResults, DataQuality, ImportSnapshot } from '@/types/sage';
import { calculateKPIs, DEFAULT_SETTINGS } from '@/lib/kpiCalculator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  saveImportSession,
  loadAllSnapshots,
  loadLatestSession,
  deleteImportSession,
  updateSnapshotLabel,
  saveSettings as dbSaveSettings,
  loadSettings as dbLoadSettings,
  migrateFromLocalStorage,
  loadSessionPieces,
  loadSession as loadSessionFromDb,
} from '@/lib/database';

interface DataContextType {
  // Data
  pieces: Piece[];
  parsedData: ParsedData | null;
  kpis: KPIResults | null;
  dataQuality: DataQuality | null;

  // Settings & Filters
  settings: Settings;
  filters: Filters;

  // History
  importHistory: ImportSnapshot[];

  // State
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;
  hasData: boolean;

  // Actions
  importData: (data: ParsedData) => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => void;
  updateFilters: (filters: Partial<Filters>) => void;
  resetData: () => void;
  getFilteredPieces: () => Piece[];
  deleteSnapshot: (id: string) => void;
  renameSnapshot: (id: string, label: string) => void;
  loadSession: (snapshotId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [filters, setFilters] = useState<Filters>({
    dateDebut: null,
    dateFin: null,
    commercial: null,
    famille: null,
    client: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importHistory, setImportHistory] = useState<ImportSnapshot[]>([]);
  const initialLoadDone = useRef(false);

  const hasData = pieces.length > 0;

  // ── Restore last session + history on mount ──
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    (async () => {
      try {
        // Migrate old localStorage data if present
        await migrateFromLocalStorage();

        // Load settings
        const savedSettings = await dbLoadSettings();
        if (savedSettings) {
          setSettings(savedSettings);
        }

        // Load all snapshots for history
        const snapshots = await loadAllSnapshots();
        setImportHistory(snapshots);

        // Restore last session data
        const lastSession = await loadLatestSession();
        if (lastSession) {
          setPieces(lastSession.pieces);
          setParsedData(lastSession.parsedData);
        }
      } catch (err) {
        console.error('Failed to restore from database:', err);
      } finally {
        setIsRestoring(false);
      }
    })();
  }, []);

  // ── Persist settings to DB when they change ──
  const settingsLoaded = useRef(false);
  useEffect(() => {
    if (!settingsLoaded.current) {
      settingsLoaded.current = true;
      return;
    }
    dbSaveSettings(settings);
  }, [settings]);

  const importData = useCallback(async (data: ParsedData) => {
    setIsLoading(true);
    setError(null);

    try {
      setParsedData(data);
      setPieces(data.pieces);

      // Auto-populate margin families if empty
      if (settings.margesFamille.length === 0 && data.familles.length > 0) {
        setSettings(prev => ({
          ...prev,
          margesFamille: data.familles.map(f => ({ famille: f, tauxMarge: 0 })),
        }));
      }

      // Calculate KPIs for snapshot (unfiltered)
      const noFilters: Filters = { dateDebut: null, dateFin: null, commercial: null, famille: null, client: null };
      const snapshotKpis = calculateKPIs(data.pieces, settings, noFilters);

      // Determine period range
      const dates = data.pieces
        .map(p => p.datePiece)
        .filter((d): d is Date => d !== null)
        .sort((a, b) => a.getTime() - b.getTime());
      const periodeDebut = dates.length > 0 ? dates[0].toISOString() : null;
      const periodeFin = dates.length > 0 ? dates[dates.length - 1].toISOString() : null;

      const sessionId = crypto.randomUUID();
      const snapshot: ImportSnapshot = {
        id: sessionId,
        date: new Date().toISOString(),
        label: `Import du ${format(new Date(), 'dd MMM yyyy à HH:mm', { locale: fr })}`,
        kpis: snapshotKpis,
        meta: {
          totalPieces: data.pieces.length,
          nbFactures: data.pieces.filter(p => p.type === 'Facture').length,
          nbDevis: data.pieces.filter(p => p.type === 'Devis').length,
          nbAvoirs: data.pieces.filter(p => p.type === 'Avoir').length,
          nbClients: data.clients.length,
          nbCommerciaux: data.commerciaux.length,
          periodeDebut,
          periodeFin,
        },
      };

      // Save to IndexedDB
      await saveImportSession(sessionId, data.pieces, snapshot, data);

      setImportHistory(prev => [...prev, snapshot]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'import');
    } finally {
      setIsLoading(false);
    }
  }, [settings]);

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetData = useCallback(() => {
    setPieces([]);
    setParsedData(null);
    setError(null);
    setFilters({
      dateDebut: null,
      dateFin: null,
      commercial: null,
      famille: null,
      client: null,
    });
  }, []);

  const deleteSnapshot = useCallback(async (id: string) => {
    await deleteImportSession(id);
    setImportHistory(prev => prev.filter(s => s.id !== id));
  }, []);

  const renameSnapshot = useCallback(async (id: string, label: string) => {
    await updateSnapshotLabel(id, label);
    setImportHistory(prev => prev.map(s => s.id === id ? { ...s, label } : s));
  }, []);

  // Load a specific session from history into the dashboard
  const loadSession = useCallback(async (snapshotId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const sessionPieces = await loadSessionPieces(snapshotId);
      const sessionMeta = await loadSessionFromDb(snapshotId);

      if (sessionPieces.length === 0 || !sessionMeta) {
        throw new Error('Session introuvable dans la base de données');
      }

      const restoredData: ParsedData = {
        pieces: sessionPieces,
        commerciaux: sessionMeta.parsedDataMeta.commerciaux,
        familles: sessionMeta.parsedDataMeta.familles,
        clients: sessionMeta.parsedDataMeta.clients,
        dataQuality: sessionMeta.parsedDataMeta.dataQuality,
      };

      setPieces(sessionPieces);
      setParsedData(restoredData);
      setFilters({
        dateDebut: null,
        dateFin: null,
        commercial: null,
        famille: null,
        client: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getFilteredPieces = useCallback(() => {
    return pieces.filter(piece => {
      if (filters.dateDebut && piece.datePiece && piece.datePiece < filters.dateDebut) {
        return false;
      }
      if (filters.dateFin && piece.datePiece && piece.datePiece > filters.dateFin) {
        return false;
      }
      if (filters.commercial && piece.representant !== filters.commercial) {
        return false;
      }
      if (filters.famille && piece.familleClients !== filters.famille) {
        return false;
      }
      if (filters.client && piece.client !== filters.client) {
        return false;
      }
      return true;
    });
  }, [pieces, filters]);

  const kpis = hasData ? calculateKPIs(pieces, settings, filters) : null;
  const dataQuality = parsedData?.dataQuality ?? null;

  return (
    <DataContext.Provider
      value={{
        pieces,
        parsedData,
        kpis,
        dataQuality,
        settings,
        filters,
        importHistory,
        isLoading,
        isRestoring,
        error,
        hasData,
        importData,
        updateSettings,
        updateFilters,
        resetData,
        getFilteredPieces,
        deleteSnapshot,
        renameSnapshot,
        loadSession,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
