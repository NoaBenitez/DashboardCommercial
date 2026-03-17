import { Piece, Settings, KPIResults, Filters } from '@/types/sage';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const DEFAULT_SETTINGS: Settings = {
  objectifCA: 0,
  ponderations: [
    { statut: 'Accepté', poids: 0.9 },
    { statut: 'En-cours', poids: 0.5 },
    { statut: 'A relancer', poids: 0.3 },
    { statut: 'A envoyer', poids: 0.2 },
  ],
  margesFamille: [],
  couts: [],
  statutsPipeline: ['A envoyer', 'En-cours', 'A relancer', 'Accepté'],
  modeMargeType: 'taux',
};

function filterPieces(pieces: Piece[], filters: Filters): Piece[] {
  return pieces.filter(piece => {
    // Filtre période
    if (filters.dateDebut && piece.datePiece) {
      if (piece.datePiece < filters.dateDebut) return false;
    }
    if (filters.dateFin && piece.datePiece) {
      if (piece.datePiece > filters.dateFin) return false;
    }
    
    // Filtre commercial
    if (filters.commercial && piece.representant !== filters.commercial) {
      return false;
    }
    
    // Filtre famille
    if (filters.famille && piece.familleClients !== filters.famille) {
      return false;
    }
    
    // Filtre client
    if (filters.client && piece.client !== filters.client) {
      return false;
    }
    
    return true;
  });
}

export function calculateKPIs(
  pieces: Piece[],
  settings: Settings,
  filters: Filters
): KPIResults {
  const filtered = filterPieces(pieces, filters);
  
  // 1. CA net
  // IMPORTANT: Dans l'export Sage, les avoirs ont déjà des montants NÉGATIFS
  // Donc on additionne simplement factures + avoirs (pas de soustraction)
  const factures = filtered.filter(p => p.type === 'Facture');
  const avoirs = filtered.filter(p => p.type === 'Avoir');
  const caFactures = factures.reduce((sum, p) => sum + p.totalHT, 0);
  const caAvoirs = avoirs.reduce((sum, p) => sum + p.totalHT, 0); // déjà négatif
  const caNet = caFactures + caAvoirs; // addition, pas soustraction
  
  // 2. Taux d'atteinte objectif
  const tauxAtteinte = settings.objectifCA > 0 
    ? (caNet / settings.objectifCA) * 100 
    : 0;
  
  // 3. Marge
  let marge = 0;
  if (settings.modeMargeType === 'taux') {
    // Mode taux par famille
    factures.forEach(facture => {
      const margeFamille = settings.margesFamille.find(
        m => m.famille === facture.familleClients
      );
      const taux = margeFamille?.tauxMarge ?? 0;
      marge += facture.totalHT * (taux / 100);
    });
    // Les avoirs ont déjà des montants négatifs, donc on additionne
    avoirs.forEach(avoir => {
      const margeFamille = settings.margesFamille.find(
        m => m.famille === avoir.familleClients
      );
      const taux = margeFamille?.tauxMarge ?? 0;
      marge += avoir.totalHT * (taux / 100); // addition (avoir.totalHT est négatif)
    });
  } else {
    // Mode coût
    const coutMap = new Map(settings.couts.map(c => [c.numPiece, c.cout]));
    const totalCouts = filtered
      .filter(p => p.type === 'Facture' && p.numPiece)
      .reduce((sum, p) => sum + (coutMap.get(p.numPiece!) ?? 0), 0);
    marge = caNet - totalCouts;
  }
  const margePercent = caNet > 0 ? (marge / caNet) * 100 : 0;
  
  // 4. Leads entrants (devis)
  const devis = filtered.filter(p => p.type === 'Devis');
  const leadsEntrants = devis.length;
  
  // 5. Taux de transformation
  const devisAcceptes = devis.filter(d => 
    d.statut.toLowerCase().includes('accept')
  ).length;
  const tauxTransformation = leadsEntrants > 0 
    ? (devisAcceptes / leadsEntrants) * 100 
    : 0;
  
  // 6. Panier moyen
  const panierMoyen = factures.length > 0 
    ? caNet / factures.length 
    : 0;
  
  // 7. Pipeline
  const devisPipeline = filtered.filter(p => 
    p.type === 'Devis' && 
    settings.statutsPipeline.some(s => 
      p.statut.toLowerCase().includes(s.toLowerCase())
    )
  );
  const pipeline = devisPipeline.reduce((sum, p) => sum + p.totalHT, 0);
  
  // 8. Forecast pondéré
  const ponderationMap = new Map(
    settings.ponderations.map(p => [p.statut.toLowerCase(), p.poids])
  );
  const forecastPondere = devisPipeline.reduce((sum, p) => {
    // Trouver la pondération qui matche
    let poids = 0;
    for (const [statut, poidsVal] of ponderationMap) {
      if (p.statut.toLowerCase().includes(statut)) {
        poids = poidsVal;
        break;
      }
    }
    return sum + (p.totalHT * poids);
  }, 0);
  
  // 9. Cycle de vente moyen
  const facturesAvecCycle = factures.filter(f => f.cycleJours !== null);
  const cycleVenteMoyen = facturesAvecCycle.length > 0
    ? facturesAvecCycle.reduce((sum, f) => sum + (f.cycleJours ?? 0), 0) / facturesAvecCycle.length
    : null;
  
  // 10. CA par commercial
  const caParCommercial: Record<string, number> = {};
  factures.forEach(f => {
    const rep = f.representant ?? 'Non assigné';
    caParCommercial[rep] = (caParCommercial[rep] ?? 0) + f.totalHT;
  });
  // Les avoirs ont déjà des montants négatifs, donc on additionne
  avoirs.forEach(a => {
    const rep = a.representant ?? 'Non assigné';
    caParCommercial[rep] = (caParCommercial[rep] ?? 0) + a.totalHT; // addition
  });
  
  // CA par mois
  const caParMoisMap: Map<string, number> = new Map();
  factures.forEach(f => {
    if (f.datePiece) {
      const mois = format(f.datePiece, 'MMM yyyy', { locale: fr });
      caParMoisMap.set(mois, (caParMoisMap.get(mois) ?? 0) + f.totalHT);
    }
  });
  // Les avoirs ont déjà des montants négatifs, donc on additionne
  avoirs.forEach(a => {
    if (a.datePiece) {
      const mois = format(a.datePiece, 'MMM yyyy', { locale: fr });
      caParMoisMap.set(mois, (caParMoisMap.get(mois) ?? 0) + a.totalHT); // addition
    }
  });
  const caParMois = Array.from(caParMoisMap.entries())
    .map(([mois, ca]) => ({ mois, ca }))
    .sort((a, b) => {
      // Trier chronologiquement
      const dateA = new Date(a.mois);
      const dateB = new Date(b.mois);
      return dateA.getTime() - dateB.getTime();
    });
  
  // Pipeline par statut
  const pipelineParStatutMap: Map<string, number> = new Map();
  devisPipeline.forEach(d => {
    pipelineParStatutMap.set(
      d.statut, 
      (pipelineParStatutMap.get(d.statut) ?? 0) + d.totalHT
    );
  });
  const pipelineParStatut = Array.from(pipelineParStatutMap.entries())
    .map(([statut, montant]) => ({ statut, montant }));
  
  // Taux transformation par mois
  const devisParMois: Map<string, { total: number; acceptes: number }> = new Map();
  devis.forEach(d => {
    if (d.datePiece) {
      const mois = format(d.datePiece, 'MMM yyyy', { locale: fr });
      const existing = devisParMois.get(mois) ?? { total: 0, acceptes: 0 };
      existing.total++;
      if (d.statut.toLowerCase().includes('accept')) {
        existing.acceptes++;
      }
      devisParMois.set(mois, existing);
    }
  });
  const transformationParMois = Array.from(devisParMois.entries())
    .map(([mois, data]) => ({
      mois,
      taux: data.total > 0 ? (data.acceptes / data.total) * 100 : 0,
    }));
  
  return {
    caNet,
    tauxAtteinte,
    marge,
    margePercent,
    leadsEntrants,
    tauxTransformation,
    panierMoyen,
    pipeline,
    forecastPondere,
    cycleVenteMoyen,
    caParCommercial,
    caParMois,
    pipelineParStatut,
    transformationParMois,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPeriodLabel(dateDebut: Date | null, dateFin: Date | null): string {
  if (!dateDebut && !dateFin) {
    return 'Toutes les données';
  }
  
  const formatDate = (date: Date) => format(date, 'MMM yyyy', { locale: fr });
  
  if (dateDebut && dateFin) {
    return `${formatDate(dateDebut)} → ${formatDate(dateFin)}`;
  }
  
  if (dateDebut) {
    return `Depuis ${formatDate(dateDebut)}`;
  }
  
  return `Jusqu'à ${formatDate(dateFin!)}`;
}
