import { Piece, PieceType, ParsedData, DataQuality } from '@/types/sage';
import * as XLSX from 'xlsx';

// Mapping intelligent des colonnes - l'IA essaie de deviner la bonne colonne
const COLUMN_PATTERNS: Record<string, { patterns: RegExp[]; field: keyof Piece }> = {
  type: {
    patterns: [/^type$/i, /^type\s*pi[eè]ce$/i, /^nature$/i, /^document$/i],
    field: 'type',
  },
  statut: {
    patterns: [/^statut$/i, /^status$/i, /^[eé]tat$/i, /^state$/i],
    field: 'statut',
  },
  datePiece: {
    patterns: [/^date\s*pi[eè]ce$/i, /^date$/i, /^date\s*document$/i, /^dt$/i, /^created$/i],
    field: 'datePiece',
  },
  totalHT: {
    patterns: [/^total\s*ht$/i, /^montant\s*ht$/i, /^ht$/i, /^amount$/i, /^net$/i, /^prix\s*ht$/i],
    field: 'totalHT',
  },
  totalTTC: {
    patterns: [/^total\s*ttc$/i, /^montant\s*ttc$/i, /^ttc$/i, /^gross$/i],
    field: 'totalTTC',
  },
  totalTVA: {
    patterns: [/^total\s*tva$/i, /^tva$/i, /^vat$/i, /^tax$/i],
    field: 'totalTVA',
  },
  soldeDu: {
    patterns: [/^solde\s*d[uû]$/i, /^solde$/i, /^reste\s*[àa]\s*payer$/i, /^balance$/i, /^due$/i],
    field: 'soldeDu',
  },
  familleClients: {
    patterns: [/^famille\s*client/i, /^famille$/i, /^cat[eé]gorie/i, /^segment$/i, /^group/i],
    field: 'familleClients',
  },
  representant: {
    patterns: [/^repr[eé]sentant$/i, /^commercial$/i, /^vendeur$/i, /^sales\s*rep$/i, /^agent$/i],
    field: 'representant',
  },
  client: {
    patterns: [/^client$/i, /^customer$/i, /^nom\s*client$/i, /^raison\s*sociale$/i, /^company$/i, /^tiers$/i],
    field: 'client',
  },
  ref: {
    patterns: [/^r[eé]f\.?$/i, /^r[eé]f[eé]rence$/i, /^reference$/i, /^ref\s*affaire$/i, /^code$/i],
    field: 'ref',
  },
  numPiece: {
    patterns: [/^n[°o]?\s*pi[eè]ce$/i, /^num[eé]ro$/i, /^n[°o]$/i, /^number$/i, /^invoice\s*n/i, /^facture\s*n/i],
    field: 'numPiece',
  },
};

export interface ColumnMapping {
  sourceColumn: string;
  targetField: keyof Piece | null;
  confidence: number; // 0-1
}

export interface ImportResult {
  pieces: Piece[];
  mapping: ColumnMapping[];
  unmappedColumns: string[];
  rawHeaders: string[];
}

// Détecte automatiquement le mapping des colonnes
export function autoDetectColumns(headers: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  const usedFields = new Set<string>();

  for (const header of headers) {
    let bestMatch: { field: keyof Piece; confidence: number } | null = null;
    const normalizedHeader = header.trim().toLowerCase();

    for (const [_, config] of Object.entries(COLUMN_PATTERNS)) {
      if (usedFields.has(config.field)) continue;

      for (const pattern of config.patterns) {
        if (pattern.test(normalizedHeader)) {
          const confidence = pattern.source.startsWith('^') && pattern.source.endsWith('$') ? 1 : 0.8;
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { field: config.field, confidence };
          }
        }
      }
    }

    if (bestMatch) {
      usedFields.add(bestMatch.field);
      mappings.push({
        sourceColumn: header,
        targetField: bestMatch.field,
        confidence: bestMatch.confidence,
      });
    } else {
      mappings.push({
        sourceColumn: header,
        targetField: null,
        confidence: 0,
      });
    }
  }

  return mappings;
}

function parseDate(dateValue: unknown): Date | null {
  if (!dateValue) return null;

  // Excel date number
  if (typeof dateValue === 'number') {
    const date = XLSX.SSF.parse_date_code(dateValue);
    if (date) {
      return new Date(date.y, date.m - 1, date.d);
    }
  }

  const dateStr = String(dateValue).trim();
  if (!dateStr) return null;

  // Format français DD/MM/YYYY
  const frenchMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (frenchMatch) {
    const [, day, month, year] = frenchMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Format ISO YYYY-MM-DD
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(dateStr);
  }

  // Essayer le parsing natif
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const str = String(value)
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(/,/g, '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function normalizeType(type: string): PieceType {
  const normalized = type.toLowerCase().trim();

  if (normalized.includes('facture')) return 'Facture';
  if (normalized.includes('devis')) return 'Devis';
  if (normalized.includes('avoir')) return 'Avoir';
  if (normalized.includes('commande')) return 'Commande';
  if (normalized.includes('livraison') || normalized.includes('bl')) return 'Bon de livraison';

  return 'Autre';
}

// Parse Excel file (.xlsx, .xls)
export function parseExcelFile(data: ArrayBuffer): { headers: string[]; rows: Record<string, unknown>[] } {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' }) as unknown[][];
  
  if (jsonData.length < 2) {
    throw new Error('Le fichier ne contient pas suffisamment de données');
  }

  const headers = (jsonData[0] as string[]).map(h => String(h ?? '').trim());
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as unknown[];
    const rowObj: Record<string, unknown> = {};
    
    headers.forEach((header, index) => {
      if (header) {
        rowObj[header] = row[index];
      }
    });

    // Skip empty rows
    if (Object.values(rowObj).some(v => v !== '' && v !== null && v !== undefined)) {
      rows.push(rowObj);
    }
  }

  return { headers, rows };
}

// Parse XML file (Sage Spreadsheet 2003)
export function parseXMLFile(xmlContent: string): { headers: string[]; rows: Record<string, unknown>[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Erreur de parsing XML: ' + parseError.textContent);
  }

  const worksheet = doc.querySelector('Worksheet, ss\\:Worksheet');
  if (!worksheet) {
    throw new Error('Format XML non reconnu: pas de Worksheet trouvé');
  }

  const table = worksheet.querySelector('Table, ss\\:Table');
  if (!table) {
    throw new Error('Format XML non reconnu: pas de Table trouvé');
  }

  const xmlRows = table.querySelectorAll('Row, ss\\:Row');
  if (xmlRows.length < 2) {
    throw new Error('Le fichier ne contient pas suffisamment de données');
  }

  // Headers
  const headerRow = xmlRows[0];
  const headerCells = headerRow.querySelectorAll('Cell, ss\\:Cell');
  const headers: string[] = [];

  headerCells.forEach((cell) => {
    const data = cell.querySelector('Data, ss\\:Data');
    headers.push(data?.textContent?.trim() || '');
  });

  // Data rows
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < xmlRows.length; i++) {
    const row = xmlRows[i];
    const cells = row.querySelectorAll('Cell, ss\\:Cell');
    const rowObj: Record<string, unknown> = {};

    let cellIndex = 0;
    cells.forEach((cell) => {
      const indexAttr = cell.getAttribute('ss:Index') || cell.getAttribute('Index');
      if (indexAttr) {
        cellIndex = parseInt(indexAttr) - 1;
      }

      const data = cell.querySelector('Data, ss\\:Data');
      if (headers[cellIndex] && data?.textContent) {
        rowObj[headers[cellIndex]] = data.textContent.trim();
      }
      cellIndex++;
    });

    if (Object.keys(rowObj).length > 0) {
      rows.push(rowObj);
    }
  }

  return { headers: headers.filter(h => h), rows };
}

// Convertit les données brutes en pièces avec le mapping
export function applyMappingToPieces(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping[]
): ParsedData {
  const pieces: Piece[] = [];
  const commerciauxSet = new Set<string>();
  const famillesSet = new Set<string>();
  const clientsSet = new Set<string>();

  const dataQuality: DataQuality = {
    totalPieces: 0,
    datesInvalides: 0,
    refsVides: 0,
    facturesSansDevis: 0,
    devisSansClient: 0,
    champsManquants: [],
  };

  // Créer un mapping inversé: field -> sourceColumn
  const fieldToColumn: Record<string, string> = {};
  mapping.forEach(m => {
    if (m.targetField) {
      fieldToColumn[m.targetField] = m.sourceColumn;
    }
  });

  const getValue = (row: Record<string, unknown>, field: string): unknown => {
    const col = fieldToColumn[field];
    return col ? row[col] : undefined;
  };

  for (const row of rows) {
    const typeValue = getValue(row, 'type');
    const clientValue = getValue(row, 'client');

    // Skip si pas de type ni de client
    if (!typeValue && !clientValue) continue;

    const datePiece = parseDate(getValue(row, 'datePiece'));
    if (!datePiece && getValue(row, 'datePiece')) {
      dataQuality.datesInvalides++;
    }

    const piece: Piece = {
      type: normalizeType(String(typeValue ?? 'Autre')),
      statut: String(getValue(row, 'statut') ?? ''),
      datePiece,
      totalHT: parseNumber(getValue(row, 'totalHT')),
      totalTTC: getValue(row, 'totalTTC') ? parseNumber(getValue(row, 'totalTTC')) : null,
      totalTVA: getValue(row, 'totalTVA') ? parseNumber(getValue(row, 'totalTVA')) : null,
      soldeDu: getValue(row, 'soldeDu') ? parseNumber(getValue(row, 'soldeDu')) : null,
      familleClients: getValue(row, 'familleClients') ? String(getValue(row, 'familleClients')) : null,
      representant: getValue(row, 'representant') ? String(getValue(row, 'representant')) : null,
      client: String(clientValue ?? 'Inconnu'),
      ref: getValue(row, 'ref') ? String(getValue(row, 'ref')) : null,
      numPiece: getValue(row, 'numPiece') ? String(getValue(row, 'numPiece')) : null,
      key: '',
      poids: 0,
      dateDernierDevis: null,
      cycleJours: null,
    };

    piece.key = `${piece.client}|${piece.ref ?? ''}`;

    if (piece.representant) commerciauxSet.add(piece.representant);
    if (piece.familleClients) famillesSet.add(piece.familleClients);
    if (piece.client) clientsSet.add(piece.client);

    if (!piece.ref) dataQuality.refsVides++;
    if (piece.type === 'Devis' && !piece.client) dataQuality.devisSansClient++;

    pieces.push(piece);
  }

  dataQuality.totalPieces = pieces.length;

  // Factures sans devis
  const devisKeys = new Set(pieces.filter(p => p.type === 'Devis').map(p => p.key));
  pieces.forEach(p => {
    if (p.type === 'Facture' && !devisKeys.has(p.key)) {
      dataQuality.facturesSansDevis++;
    }
  });

  return {
    pieces,
    commerciaux: Array.from(commerciauxSet).sort(),
    familles: Array.from(famillesSet).sort(),
    clients: Array.from(clientsSet).sort(),
    dataQuality,
  };
}

// Calculer le cycle de vente pour chaque facture
export function calculateSalesCycle(pieces: Piece[]): Piece[] {
  const devisByKey: Map<string, { date: Date; piece: Piece }[]> = new Map();

  pieces.forEach(piece => {
    if (piece.type === 'Devis' && piece.datePiece) {
      const existing = devisByKey.get(piece.key) || [];
      existing.push({ date: piece.datePiece, piece });
      devisByKey.set(piece.key, existing);
    }
  });

  devisByKey.forEach((devis) => {
    devis.sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  return pieces.map(piece => {
    if (piece.type !== 'Facture' || !piece.datePiece) return piece;

    const devis = devisByKey.get(piece.key);
    if (!devis || devis.length === 0) return piece;

    let left = 0;
    let right = devis.length - 1;
    let lastDevisBeforeFacture: { date: Date } | null = null;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (devis[mid].date <= piece.datePiece) {
        lastDevisBeforeFacture = devis[mid];
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    if (lastDevisBeforeFacture) {
      const cycleJours = Math.floor(
        (piece.datePiece.getTime() - lastDevisBeforeFacture.date.getTime()) /
        (1000 * 60 * 60 * 24)
      );
      return {
        ...piece,
        dateDernierDevis: lastDevisBeforeFacture.date,
        cycleJours,
      };
    }

    return piece;
  });
}

// Legacy function for backwards compatibility
export function parseXMLSage(xmlContent: string): ParsedData {
  const { headers, rows } = parseXMLFile(xmlContent);
  const mapping = autoDetectColumns(headers);
  return applyMappingToPieces(rows, mapping);
}
