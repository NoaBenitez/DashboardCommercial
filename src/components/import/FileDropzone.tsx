import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, Loader2, FileX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { ColumnMapper } from './ColumnMapper';
import { 
  parseExcelFile, 
  parseXMLFile, 
  autoDetectColumns, 
  applyMappingToPieces,
  calculateSalesCycle,
  ColumnMapping 
} from '@/lib/fileParser';

type ImportStep = 'upload' | 'mapping' | 'processing';

export function FileDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<ImportStep>('upload');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Intermediate data for mapping
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping[]>([]);
  
  const { importData, settings } = useData();
  const navigate = useNavigate();

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let headers: string[];
      let rows: Record<string, unknown>[];
      
      const fileName = file.name.toLowerCase();
      
      if (fileName.endsWith('.xml')) {
        const content = await file.text();
        const result = parseXMLFile(content);
        headers = result.headers;
        rows = result.rows;
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const result = parseExcelFile(buffer);
        headers = result.headers;
        rows = result.rows;
      } else {
        throw new Error('Format non supporté. Utilisez .xml, .xlsx ou .xls');
      }
      
      if (rows.length === 0) {
        throw new Error('Le fichier ne contient aucune donnée');
      }
      
      // Auto-detect columns
      const mapping = autoDetectColumns(headers);
      
      setRawHeaders(headers);
      setRawRows(rows);
      setColumnMapping(mapping);
      setStep('mapping');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du parsing');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConfirmMapping = useCallback(async () => {
    setStep('processing');
    setIsLoading(true);
    
    try {
      const parsedData = applyMappingToPieces(rawRows, columnMapping);
      const piecesWithCycle = calculateSalesCycle(parsedData.pieces);
      
      // Apply weights
      const piecesWithPoids = piecesWithCycle.map(piece => {
        const ponderation = settings.ponderations.find(p =>
          piece.statut.toLowerCase().includes(p.statut.toLowerCase())
        );
        return { ...piece, poids: ponderation?.poids ?? 0 };
      });
      
      await importData({ ...parsedData, pieces: piecesWithPoids });
      navigate('/dashboard');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'import');
      setStep('mapping');
    } finally {
      setIsLoading(false);
    }
  }, [rawRows, columnMapping, settings.ponderations, importData, navigate]);

  const handleCancelMapping = useCallback(() => {
    setStep('upload');
    setRawHeaders([]);
    setRawRows([]);
    setColumnMapping([]);
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.toLowerCase();
      if (ext.endsWith('.xml') || ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
        processFile(file);
      } else {
        setError('Format non supporté. Utilisez .xml, .xlsx ou .xls');
      }
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  // Step: Column Mapping
  if (step === 'mapping') {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center p-8">
        <div className="w-full max-w-4xl animate-fade-in">
          <ColumnMapper
            mapping={columnMapping}
            onMappingChange={setColumnMapping}
            onConfirm={handleConfirmMapping}
            onCancel={handleCancelMapping}
            previewData={rawRows.slice(0, 3)}
          />
        </div>
      </div>
    );
  }

  // Step: Upload
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-8">
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            Importer vos données
          </h1>
          <p className="text-muted-foreground">
            Glissez-déposez votre fichier Excel ou XML Sage
          </p>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn('dropzone', isDragging && 'active')}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">
                {step === 'processing' ? 'Import en cours...' : 'Analyse du fichier...'}
              </p>
            </div>
          ) : (
            <>
              <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-lg font-medium">
                Glissez votre fichier ici
              </p>
              <p className="mb-6 text-sm text-muted-foreground">
                ou cliquez pour parcourir
              </p>

              <label>
                <input
                  type="file"
                  accept=".xml,.xlsx,.xls"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <Button asChild>
                  <span>Importer un fichier</span>
                </Button>
              </label>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-lg bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Erreur d'import</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-xl bg-muted/50 p-6">
          <h3 className="mb-3 font-medium">Formats supportés</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              <span><strong>Excel (.xlsx, .xls)</strong> — Fichiers Excel standards</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              <span><strong>XML Sage</strong> — Export format "Spreadsheet 2003"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
              <span>Les colonnes sont détectées automatiquement</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-success" />
              <span>Données traitées localement (pas d'envoi serveur)</span>
            </li>
          </ul>
        </div>

        <div className="mt-4 rounded-xl bg-muted/50 p-6">
          <h3 className="mb-3 font-medium">Colonnes attendues</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div>
              <p className="mb-2 font-medium text-primary text-xs uppercase tracking-wide">Obligatoires</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                  <span><strong>Type</strong> — Type de pièce</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                  <span><strong>Date pièce</strong> — Date du document</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                  <span><strong>Total HT</strong> — Montant hors taxes</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                  <span><strong>Client</strong> — Nom du client</span>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-2 font-medium text-primary text-xs uppercase tracking-wide">Optionnelles</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  <span>Statut</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  <span>Total TTC</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  <span>Total TVA</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  <span>Solde dû</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  <span>Famille clients</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  <span>Commercial / Représentant</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  <span>Référence</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  <span>N° Pièce</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
