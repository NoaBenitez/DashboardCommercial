import { describe, it, expect } from 'vitest';
import { parseXMLSage, calculateSalesCycle } from '@/lib/xmlParser';

const mockXML = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Liste des pièces clients">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Type</Data></Cell>
        <Cell><Data ss:Type="String">Statut</Data></Cell>
        <Cell><Data ss:Type="String">Date pièce</Data></Cell>
        <Cell><Data ss:Type="String">Total HT</Data></Cell>
        <Cell><Data ss:Type="String">Client</Data></Cell>
        <Cell><Data ss:Type="String">Réf.</Data></Cell>
        <Cell><Data ss:Type="String">Représentant</Data></Cell>
        <Cell><Data ss:Type="String">Famille clients</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Devis</Data></Cell>
        <Cell><Data ss:Type="String">En-cours</Data></Cell>
        <Cell><Data ss:Type="String">01/01/2024</Data></Cell>
        <Cell><Data ss:Type="Number">1000</Data></Cell>
        <Cell><Data ss:Type="String">Client A</Data></Cell>
        <Cell><Data ss:Type="String">REF001</Data></Cell>
        <Cell><Data ss:Type="String">Commercial 1</Data></Cell>
        <Cell><Data ss:Type="String">Famille A</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Facture</Data></Cell>
        <Cell><Data ss:Type="String">Payée</Data></Cell>
        <Cell><Data ss:Type="String">15/01/2024</Data></Cell>
        <Cell><Data ss:Type="Number">1000</Data></Cell>
        <Cell><Data ss:Type="String">Client A</Data></Cell>
        <Cell><Data ss:Type="String">REF001</Data></Cell>
        <Cell><Data ss:Type="String">Commercial 1</Data></Cell>
        <Cell><Data ss:Type="String">Famille A</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Devis</Data></Cell>
        <Cell><Data ss:Type="String">Accepté</Data></Cell>
        <Cell><Data ss:Type="String">05/01/2024</Data></Cell>
        <Cell><Data ss:Type="Number">2000</Data></Cell>
        <Cell><Data ss:Type="String">Client B</Data></Cell>
        <Cell><Data ss:Type="String">REF002</Data></Cell>
        <Cell><Data ss:Type="String">Commercial 2</Data></Cell>
        <Cell><Data ss:Type="String">Famille B</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;

describe('XML Parser', () => {
  it('should parse XML correctly', () => {
    const result = parseXMLSage(mockXML);
    
    expect(result.pieces).toHaveLength(3);
    expect(result.commerciaux).toEqual(['Commercial 1', 'Commercial 2']);
    expect(result.familles).toEqual(['Famille A', 'Famille B']);
    expect(result.clients).toEqual(['Client A', 'Client B']);
  });
  
  it('should normalize piece types', () => {
    const result = parseXMLSage(mockXML);
    
    expect(result.pieces[0].type).toBe('Devis');
    expect(result.pieces[1].type).toBe('Facture');
  });
  
  it('should parse dates in French format', () => {
    const result = parseXMLSage(mockXML);
    
    const firstPiece = result.pieces[0];
    expect(firstPiece.datePiece).toBeInstanceOf(Date);
    expect(firstPiece.datePiece?.getDate()).toBe(1);
    expect(firstPiece.datePiece?.getMonth()).toBe(0); // January
    expect(firstPiece.datePiece?.getFullYear()).toBe(2024);
  });
  
  it('should calculate data quality metrics', () => {
    const result = parseXMLSage(mockXML);
    
    expect(result.dataQuality.totalPieces).toBe(3);
    expect(result.dataQuality.datesInvalides).toBe(0);
  });
  
  it('should generate correct keys', () => {
    const result = parseXMLSage(mockXML);
    
    expect(result.pieces[0].key).toBe('Client A|REF001');
    expect(result.pieces[2].key).toBe('Client B|REF002');
  });
});

describe('Sales Cycle Calculator', () => {
  it('should calculate sales cycle for factures with matching devis', () => {
    const parsed = parseXMLSage(mockXML);
    const withCycle = calculateSalesCycle(parsed.pieces);
    
    const facture = withCycle.find(p => p.type === 'Facture');
    expect(facture).toBeDefined();
    expect(facture?.cycleJours).toBe(14); // 15 Jan - 1 Jan = 14 days
    expect(facture?.dateDernierDevis).toBeDefined();
  });
  
  it('should not calculate cycle for devis', () => {
    const parsed = parseXMLSage(mockXML);
    const withCycle = calculateSalesCycle(parsed.pieces);
    
    const devis = withCycle.filter(p => p.type === 'Devis');
    devis.forEach(d => {
      expect(d.cycleJours).toBeNull();
    });
  });
});
