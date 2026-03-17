import Dexie, { type EntityTable } from 'dexie';
import type { ImportSnapshot, Settings, ParsedData, Piece } from '@/types/sage';

// ── Stored types (dates serialized as strings for IndexedDB) ──

export interface StoredPiece {
  id?: number;
  sessionId: string; // links pieces to a session
  type: string;
  statut: string;
  datePiece: string | null;
  totalHT: number;
  totalTTC: number | null;
  totalTVA: number | null;
  soldeDu: number | null;
  familleClients: string | null;
  representant: string | null;
  client: string;
  ref: string | null;
  numPiece: string | null;
  key: string;
  poids: number;
  dateDernierDevis: string | null;
  cycleJours: number | null;
}

export interface StoredSession {
  id: string; // same as snapshot id
  date: string;
  parsedDataMeta: {
    commerciaux: string[];
    familles: string[];
    clients: string[];
    dataQuality: ParsedData['dataQuality'];
  };
}

// ── Database definition ──

class PSLDatabase extends Dexie {
  snapshots!: EntityTable<ImportSnapshot, 'id'>;
  pieces!: EntityTable<StoredPiece, 'id'>;
  sessions!: EntityTable<StoredSession, 'id'>;
  settings!: EntityTable<{ id: string; data: Settings }, 'id'>;

  constructor() {
    super('PSLDashboard');

    this.version(1).stores({
      snapshots: 'id, date',
      pieces: '++id, sessionId',
      sessions: 'id, date',
      settings: 'id',
    });
  }
}

export const db = new PSLDatabase();

// ── Helper: convert Piece <-> StoredPiece ──

function pieceToStored(piece: Piece, sessionId: string): StoredPiece {
  return {
    sessionId,
    type: piece.type,
    statut: piece.statut,
    datePiece: piece.datePiece ? piece.datePiece.toISOString() : null,
    totalHT: piece.totalHT,
    totalTTC: piece.totalTTC,
    totalTVA: piece.totalTVA,
    soldeDu: piece.soldeDu,
    familleClients: piece.familleClients,
    representant: piece.representant,
    client: piece.client,
    ref: piece.ref,
    numPiece: piece.numPiece,
    key: piece.key,
    poids: piece.poids,
    dateDernierDevis: piece.dateDernierDevis ? piece.dateDernierDevis.toISOString() : null,
    cycleJours: piece.cycleJours,
  };
}

function storedToPiece(stored: StoredPiece): Piece {
  return {
    type: stored.type as Piece['type'],
    statut: stored.statut,
    datePiece: stored.datePiece ? new Date(stored.datePiece) : null,
    totalHT: stored.totalHT,
    totalTTC: stored.totalTTC,
    totalTVA: stored.totalTVA,
    soldeDu: stored.soldeDu,
    familleClients: stored.familleClients,
    representant: stored.representant,
    client: stored.client,
    ref: stored.ref,
    numPiece: stored.numPiece,
    key: stored.key,
    poids: stored.poids,
    dateDernierDevis: stored.dateDernierDevis ? new Date(stored.dateDernierDevis) : null,
    cycleJours: stored.cycleJours,
  };
}

// ── Public API ──

/** Save a full import session (pieces + snapshot + meta) */
export async function saveImportSession(
  sessionId: string,
  pieces: Piece[],
  snapshot: ImportSnapshot,
  parsedData: ParsedData,
): Promise<void> {
  const storedPieces = pieces.map(p => pieceToStored(p, sessionId));

  await db.transaction('rw', [db.snapshots, db.pieces, db.sessions], async () => {
    await db.snapshots.put(snapshot);
    await db.pieces.bulkPut(storedPieces);
    await db.sessions.put({
      id: sessionId,
      date: snapshot.date,
      parsedDataMeta: {
        commerciaux: parsedData.commerciaux,
        familles: parsedData.familles,
        clients: parsedData.clients,
        dataQuality: parsedData.dataQuality,
      },
    });
  });
}

/** Load all snapshots (for history / evolution page) */
export async function loadAllSnapshots(): Promise<ImportSnapshot[]> {
  return db.snapshots.orderBy('date').toArray();
}

/** Load pieces for a given session */
export async function loadSessionPieces(sessionId: string): Promise<Piece[]> {
  const stored = await db.pieces.where('sessionId').equals(sessionId).toArray();
  return stored.map(storedToPiece);
}

/** Load session metadata */
export async function loadSession(sessionId: string): Promise<StoredSession | undefined> {
  return db.sessions.get(sessionId);
}

/** Load the latest session (to restore on app start) */
export async function loadLatestSession(): Promise<{
  pieces: Piece[];
  parsedData: ParsedData;
  snapshot: ImportSnapshot;
} | null> {
  const snapshots = await db.snapshots.orderBy('date').reverse().limit(1).toArray();
  if (snapshots.length === 0) return null;

  const snapshot = snapshots[0];
  const session = await db.sessions.get(snapshot.id);
  if (!session) return null;

  const pieces = await loadSessionPieces(snapshot.id);

  const parsedData: ParsedData = {
    pieces,
    commerciaux: session.parsedDataMeta.commerciaux,
    familles: session.parsedDataMeta.familles,
    clients: session.parsedDataMeta.clients,
    dataQuality: session.parsedDataMeta.dataQuality,
  };

  return { pieces, parsedData, snapshot };
}

/** Delete a snapshot and its associated pieces/session */
export async function deleteImportSession(sessionId: string): Promise<void> {
  await db.transaction('rw', [db.snapshots, db.pieces, db.sessions], async () => {
    await db.snapshots.delete(sessionId);
    await db.pieces.where('sessionId').equals(sessionId).delete();
    await db.sessions.delete(sessionId);
  });
}

/** Update snapshot label */
export async function updateSnapshotLabel(id: string, label: string): Promise<void> {
  await db.snapshots.update(id, { label });
}

/** Save settings */
export async function saveSettings(settings: Settings): Promise<void> {
  await db.settings.put({ id: 'current', data: settings });
}

/** Load settings */
export async function loadSettings(): Promise<Settings | null> {
  const entry = await db.settings.get('current');
  return entry?.data ?? null;
}

/** Migrate from old localStorage history (one-time) */
export async function migrateFromLocalStorage(): Promise<void> {
  const LEGACY_KEY = 'psl-import-history';
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return;

  try {
    const snapshots: ImportSnapshot[] = JSON.parse(raw);
    if (snapshots.length > 0) {
      const existingCount = await db.snapshots.count();
      if (existingCount === 0) {
        // Only migrate if DB is empty
        await db.snapshots.bulkPut(snapshots);
      }
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch {
    // Ignore migration errors
  }
}
