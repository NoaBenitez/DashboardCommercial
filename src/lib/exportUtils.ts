import { Piece, KPIResults } from '@/types/sage';

export function exportKPIsToCSV(kpis: KPIResults): string {
  const lines = [
    'KPI,Valeur',
    `CA Net,${kpis.caNet}`,
    `Taux d'atteinte objectif,${kpis.tauxAtteinte}%`,
    `Marge,${kpis.marge}`,
    `Marge (%),${kpis.margePercent}%`,
    `Leads entrants,${kpis.leadsEntrants}`,
    `Taux de transformation,${kpis.tauxTransformation}%`,
    `Panier moyen,${kpis.panierMoyen}`,
    `Pipeline,${kpis.pipeline}`,
    `Forecast pondéré,${kpis.forecastPondere}`,
    `Cycle de vente moyen (jours),${kpis.cycleVenteMoyen ?? 'N/A'}`,
  ];
  
  lines.push('', 'CA par Commercial');
  Object.entries(kpis.caParCommercial).forEach(([commercial, ca]) => {
    lines.push(`${commercial},${ca}`);
  });
  
  return lines.join('\n');
}

export function exportKPIsToJSON(kpis: KPIResults): string {
  return JSON.stringify(kpis, null, 2);
}

export function exportPiecesToCSV(pieces: Piece[]): string {
  const headers = [
    'Type',
    'Statut',
    'Date',
    'Total HT',
    'Total TTC',
    'Solde dû',
    'Famille',
    'Représentant',
    'Client',
    'Référence',
    'N° Pièce',
  ];
  
  const lines = [headers.join(';')];
  
  pieces.forEach(p => {
    const row = [
      p.type,
      p.statut,
      p.datePiece?.toLocaleDateString('fr-FR') ?? '',
      p.totalHT.toString().replace('.', ','),
      p.totalTTC?.toString().replace('.', ',') ?? '',
      p.soldeDu?.toString().replace('.', ',') ?? '',
      p.familleClients ?? '',
      p.representant ?? '',
      p.client,
      p.ref ?? '',
      p.numPiece ?? '',
    ];
    lines.push(row.join(';'));
  });
  
  return lines.join('\n');
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
