// Types pour les données Sage importées

export interface Piece {
  type: PieceType;
  statut: string;
  datePiece: Date | null;
  totalHT: number;
  totalTTC: number | null;
  totalTVA: number | null;
  soldeDu: number | null;
  familleClients: string | null;
  representant: string | null;
  client: string;
  ref: string | null;
  numPiece: string | null;
  key: string; // client + '|' + (ref ?? '')
  poids: number;
  dateDernierDevis: Date | null;
  cycleJours: number | null;
}

export type PieceType = 
  | 'Facture' 
  | 'Devis' 
  | 'Avoir' 
  | 'Commande' 
  | 'Bon de livraison'
  | 'Autre';

export interface Ponderation {
  statut: string;
  poids: number;
}

export interface MargeFamille {
  famille: string;
  tauxMarge: number;
}

export interface Cout {
  numPiece: string;
  cout: number;
}

export interface Settings {
  objectifCA: number;
  ponderations: Ponderation[];
  margesFamille: MargeFamille[];
  couts: Cout[];
  statutsPipeline: string[];
  modeMargeType: 'taux' | 'cout';
}

export interface KPIResults {
  caNet: number;
  tauxAtteinte: number;
  marge: number;
  margePercent: number;
  leadsEntrants: number;
  tauxTransformation: number;
  panierMoyen: number;
  pipeline: number;
  forecastPondere: number;
  cycleVenteMoyen: number | null;
  caParCommercial: Record<string, number>;
  caParMois: { mois: string; ca: number }[];
  pipelineParStatut: { statut: string; montant: number }[];
  transformationParMois: { mois: string; taux: number }[];
}

export interface DataQuality {
  totalPieces: number;
  datesInvalides: number;
  refsVides: number;
  facturesSansDevis: number;
  devisSansClient: number;
  champsManquants: { champ: string; count: number }[];
}

export interface Filters {
  dateDebut: Date | null;
  dateFin: Date | null;
  commercial: string | null;
  famille: string | null;
  client: string | null;
}

export interface ParsedData {
  pieces: Piece[];
  commerciaux: string[];
  familles: string[];
  clients: string[];
  dataQuality: DataQuality;
}

export interface ImportSnapshot {
  id: string;
  date: string; // ISO date string
  label: string;
  kpis: KPIResults;
  meta: {
    totalPieces: number;
    nbFactures: number;
    nbDevis: number;
    nbAvoirs: number;
    nbClients: number;
    nbCommerciaux: number;
    periodeDebut: string | null;
    periodeFin: string | null;
  };
}
