import { Piece, PieceType, ParsedData, DataQuality } from '@/types/sage';

// Mapping des colonnes Sage vers nos propriétés
const COLUMN_MAPPINGS: Record<string, keyof Piece | null> = {
  'Type': 'type',
  'Statut': 'statut',
  'Date pièce': 'datePiece',
  'Total HT': 'totalHT',
  'Total TTC': 'totalTTC',
  'Total TVA': 'totalTVA',
  'Solde dû': 'soldeDu',
  'Famille clients': 'familleClients',
  'Représentant': 'representant',
  'Client': 'client',
  'Réf.': 'ref',
  'N° Pièce': 'numPiece',
  // Aliases
  'Date': 'datePiece',
  'Montant HT': 'totalHT',
  'Montant TTC': 'totalTTC',
  'Commercial': 'representant',
  'Référence': 'ref',
  'Numéro pièce': 'numPiece',
};

function parseDate(dateStr: string | null | undefined): Date | null {
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

function parseNumber(value: string | null | undefined): number {
  if (!value) return 0;
  // Gérer les formats français (1 234,56) et anglais (1,234.56)
  const cleaned = value
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(/,/g, '.');
  const num = parseFloat(cleaned);
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

export function parseXMLSage(xmlContent: string): ParsedData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  
  // Vérifier les erreurs de parsing
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Erreur de parsing XML: ' + parseError.textContent);
  }
  
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
  
  // Trouver le namespace
  const worksheet = doc.querySelector('Worksheet, ss\\:Worksheet');
  if (!worksheet) {
    throw new Error('Format XML non reconnu: pas de Worksheet trouvé');
  }
  
  const table = worksheet.querySelector('Table, ss\\:Table');
  if (!table) {
    throw new Error('Format XML non reconnu: pas de Table trouvé');
  }
  
  const rows = table.querySelectorAll('Row, ss\\:Row');
  if (rows.length < 2) {
    throw new Error('Le fichier ne contient pas suffisamment de données');
  }
  
  // Première ligne = en-têtes
  const headerRow = rows[0];
  const headerCells = headerRow.querySelectorAll('Cell, ss\\:Cell');
  const headers: string[] = [];
  
  headerCells.forEach((cell) => {
    const data = cell.querySelector('Data, ss\\:Data');
    headers.push(data?.textContent?.trim() || '');
  });
  
  // Mapper les colonnes
  const columnMap: Map<number, keyof Piece> = new Map();
  headers.forEach((header, index) => {
    const mappedField = COLUMN_MAPPINGS[header];
    if (mappedField) {
      columnMap.set(index, mappedField);
    }
  });
  
  // Parser les lignes de données
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.querySelectorAll('Cell, ss\\:Cell');
    
    const rawData: Record<string, string> = {};
    let cellIndex = 0;
    
    cells.forEach((cell) => {
      // Gérer l'attribut ss:Index pour les cellules vides
      const indexAttr = cell.getAttribute('ss:Index') || cell.getAttribute('Index');
      if (indexAttr) {
        cellIndex = parseInt(indexAttr) - 1;
      }
      
      const data = cell.querySelector('Data, ss\\:Data');
      const fieldName = columnMap.get(cellIndex);
      if (fieldName && data?.textContent) {
        rawData[fieldName] = data.textContent.trim();
      }
      cellIndex++;
    });
    
    // Skip lignes vides
    if (!rawData.client && !rawData.type) continue;
    
    const datePiece = parseDate(rawData.datePiece as string);
    if (!datePiece && rawData.datePiece) {
      dataQuality.datesInvalides++;
    }
    
    const piece: Piece = {
      type: normalizeType(rawData.type as string || 'Autre'),
      statut: rawData.statut as string || '',
      datePiece,
      totalHT: parseNumber(rawData.totalHT as string),
      totalTTC: rawData.totalTTC ? parseNumber(rawData.totalTTC as string) : null,
      totalTVA: rawData.totalTVA ? parseNumber(rawData.totalTVA as string) : null,
      soldeDu: rawData.soldeDu ? parseNumber(rawData.soldeDu as string) : null,
      familleClients: rawData.familleClients as string || null,
      representant: rawData.representant as string || null,
      client: rawData.client as string || 'Inconnu',
      ref: rawData.ref as string || null,
      numPiece: rawData.numPiece as string || null,
      key: '',
      poids: 0,
      dateDernierDevis: null,
      cycleJours: null,
    };
    
    piece.key = `${piece.client}|${piece.ref ?? ''}`;
    
    // Collecter les valeurs uniques
    if (piece.representant) commerciauxSet.add(piece.representant);
    if (piece.familleClients) famillesSet.add(piece.familleClients);
    if (piece.client) clientsSet.add(piece.client);
    
    // Qualité des données
    if (!piece.ref) dataQuality.refsVides++;
    if (piece.type === 'Devis' && !piece.client) dataQuality.devisSansClient++;
    
    pieces.push(piece);
  }
  
  dataQuality.totalPieces = pieces.length;
  
  // Calculer les factures sans devis
  const devisKeys = new Set(
    pieces.filter(p => p.type === 'Devis').map(p => p.key)
  );
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
  // Créer un index des devis par clé, triés par date
  const devisByKey: Map<string, { date: Date; piece: Piece }[]> = new Map();
  
  pieces.forEach(piece => {
    if (piece.type === 'Devis' && piece.datePiece) {
      const existing = devisByKey.get(piece.key) || [];
      existing.push({ date: piece.datePiece, piece });
      devisByKey.set(piece.key, existing);
    }
  });
  
  // Trier les devis par date pour chaque clé
  devisByKey.forEach((devis) => {
    devis.sort((a, b) => a.date.getTime() - b.date.getTime());
  });
  
  // Pour chaque facture, trouver le dernier devis avant la date facture
  return pieces.map(piece => {
    if (piece.type !== 'Facture' || !piece.datePiece) return piece;
    
    const devis = devisByKey.get(piece.key);
    if (!devis || devis.length === 0) return piece;
    
    // Recherche binaire du dernier devis <= date facture
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
