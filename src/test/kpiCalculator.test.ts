import { describe, it, expect } from 'vitest';
import { calculateKPIs, DEFAULT_SETTINGS } from '@/lib/kpiCalculator';
import { Piece } from '@/types/sage';

const createMockPiece = (overrides: Partial<Piece> = {}): Piece => ({
  type: 'Facture',
  statut: '',
  datePiece: new Date('2024-01-15'),
  totalHT: 1000,
  totalTTC: 1200,
  totalTVA: 200,
  soldeDu: null,
  familleClients: 'Famille A',
  representant: 'Commercial 1',
  client: 'Client A',
  ref: 'REF001',
  numPiece: 'FAC001',
  key: 'Client A|REF001',
  poids: 0,
  dateDernierDevis: null,
  cycleJours: null,
  ...overrides,
});

describe('KPI Calculator', () => {
  const noFilters = {
    dateDebut: null,
    dateFin: null,
    commercial: null,
    famille: null,
    client: null,
  };
  
  it('should calculate CA Net correctly (avoirs have negative amounts in Sage)', () => {
    const pieces: Piece[] = [
      createMockPiece({ type: 'Facture', totalHT: 1000 }),
      createMockPiece({ type: 'Facture', totalHT: 2000 }),
      // Dans Sage, les avoirs ont des montants NÉGATIFS
      createMockPiece({ type: 'Avoir', totalHT: -500 }),
    ];
    
    const kpis = calculateKPIs(pieces, DEFAULT_SETTINGS, noFilters);
    
    // CA net = 1000 + 2000 + (-500) = 2500
    expect(kpis.caNet).toBe(2500);
  });
  
  it('should calculate leads correctly', () => {
    const pieces: Piece[] = [
      createMockPiece({ type: 'Devis' }),
      createMockPiece({ type: 'Devis' }),
      createMockPiece({ type: 'Facture' }),
    ];
    
    const kpis = calculateKPIs(pieces, DEFAULT_SETTINGS, noFilters);
    
    expect(kpis.leadsEntrants).toBe(2);
  });
  
  it('should calculate transformation rate correctly', () => {
    const pieces: Piece[] = [
      createMockPiece({ type: 'Devis', statut: 'Accepté' }),
      createMockPiece({ type: 'Devis', statut: 'En-cours' }),
      createMockPiece({ type: 'Devis', statut: 'Refusé' }),
      createMockPiece({ type: 'Devis', statut: 'Accepté' }),
    ];
    
    const kpis = calculateKPIs(pieces, DEFAULT_SETTINGS, noFilters);
    
    expect(kpis.tauxTransformation).toBe(50); // 2/4 = 50%
  });
  
  it('should calculate panier moyen correctly', () => {
    const pieces: Piece[] = [
      createMockPiece({ type: 'Facture', totalHT: 1000 }),
      createMockPiece({ type: 'Facture', totalHT: 2000 }),
    ];
    
    const kpis = calculateKPIs(pieces, DEFAULT_SETTINGS, noFilters);
    
    expect(kpis.panierMoyen).toBe(1500); // 3000 / 2
  });
  
  it('should calculate pipeline correctly', () => {
    const pieces: Piece[] = [
      createMockPiece({ type: 'Devis', statut: 'En-cours', totalHT: 1000 }),
      createMockPiece({ type: 'Devis', statut: 'Accepté', totalHT: 2000 }),
      createMockPiece({ type: 'Devis', statut: 'Refusé', totalHT: 500 }), // Not in pipeline
    ];
    
    const kpis = calculateKPIs(pieces, DEFAULT_SETTINGS, noFilters);
    
    expect(kpis.pipeline).toBe(3000);
  });
  
  it('should calculate forecast pondéré correctly', () => {
    const pieces: Piece[] = [
      createMockPiece({ type: 'Devis', statut: 'Accepté', totalHT: 1000 }), // 0.9
      createMockPiece({ type: 'Devis', statut: 'En-cours', totalHT: 1000 }), // 0.5
    ];
    
    const kpis = calculateKPIs(pieces, DEFAULT_SETTINGS, noFilters);
    
    // 1000 * 0.9 + 1000 * 0.5 = 1400
    expect(kpis.forecastPondere).toBe(1400);
  });
  
  it('should calculate taux atteinte correctly', () => {
    const pieces: Piece[] = [
      createMockPiece({ type: 'Facture', totalHT: 50000 }),
    ];
    
    const settings = { ...DEFAULT_SETTINGS, objectifCA: 100000 };
    const kpis = calculateKPIs(pieces, settings, noFilters);
    
    expect(kpis.tauxAtteinte).toBe(50);
  });
  
  it('should filter by date range', () => {
    const pieces: Piece[] = [
      createMockPiece({ type: 'Facture', totalHT: 1000, datePiece: new Date('2024-01-15') }),
      createMockPiece({ type: 'Facture', totalHT: 2000, datePiece: new Date('2024-02-15') }),
    ];
    
    const filters = {
      ...noFilters,
      dateDebut: new Date('2024-02-01'),
      dateFin: new Date('2024-02-28'),
    };
    
    const kpis = calculateKPIs(pieces, DEFAULT_SETTINGS, filters);
    
    expect(kpis.caNet).toBe(2000);
  });
  
  it('should filter by commercial', () => {
    const pieces: Piece[] = [
      createMockPiece({ type: 'Facture', totalHT: 1000, representant: 'Alice' }),
      createMockPiece({ type: 'Facture', totalHT: 2000, representant: 'Bob' }),
    ];
    
    const filters = {
      ...noFilters,
      commercial: 'Alice',
    };
    
    const kpis = calculateKPIs(pieces, DEFAULT_SETTINGS, filters);
    
    expect(kpis.caNet).toBe(1000);
  });
  
  it('should calculate CA par commercial correctly (avoirs have negative amounts)', () => {
    const pieces: Piece[] = [
      createMockPiece({ type: 'Facture', totalHT: 1000, representant: 'Alice' }),
      createMockPiece({ type: 'Facture', totalHT: 2000, representant: 'Bob' }),
      // Avoir avec montant négatif comme dans Sage
      createMockPiece({ type: 'Avoir', totalHT: -200, representant: 'Alice' }),
    ];
    
    const kpis = calculateKPIs(pieces, DEFAULT_SETTINGS, noFilters);
    
    // Alice: 1000 + (-200) = 800
    expect(kpis.caParCommercial['Alice']).toBe(800);
    expect(kpis.caParCommercial['Bob']).toBe(2000);
  });
  
  it('should calculate cycle de vente moyen correctly', () => {
    const pieces: Piece[] = [
      createMockPiece({ 
        type: 'Facture', 
        cycleJours: 10,
        dateDernierDevis: new Date('2024-01-05'),
      }),
      createMockPiece({ 
        type: 'Facture', 
        cycleJours: 20,
        dateDernierDevis: new Date('2024-01-01'),
      }),
      createMockPiece({ type: 'Facture', cycleJours: null }), // No cycle
    ];
    
    const kpis = calculateKPIs(pieces, DEFAULT_SETTINGS, noFilters);
    
    expect(kpis.cycleVenteMoyen).toBe(15); // (10 + 20) / 2
  });
});
