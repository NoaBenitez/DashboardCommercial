import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useData } from '@/contexts/DataContext';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { exportPiecesToCSV, downloadFile } from '@/lib/exportUtils';
import { formatCurrency } from '@/lib/kpiCalculator';
import { cn } from '@/lib/utils';

export default function DataPage() {
  const { hasData, isRestoring, getFilteredPieces, dataQuality } = useData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pieces');

  useEffect(() => {
    if (!isRestoring && !hasData) {
      navigate('/');
    }
  }, [hasData, isRestoring, navigate]);

  if (isRestoring || !hasData || !dataQuality) {
    return null;
  }
  
  const filteredPieces = getFilteredPieces();
  
  const handleExport = () => {
    const csv = exportPiecesToCSV(filteredPieces);
    downloadFile(csv, 'pieces-export.csv', 'text/csv');
  };
  
  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'Facture':
        return 'badge-status success';
      case 'Devis':
        return 'badge-status info';
      case 'Avoir':
        return 'badge-status destructive';
      case 'Commande':
        return 'badge-status warning';
      default:
        return 'badge-status';
    }
  };
  
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Données
          </h1>
          <p className="text-muted-foreground">
            {filteredPieces.length} pièces affichées
          </p>
        </div>
        
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exporter CSV
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="pieces">Pièces</TabsTrigger>
          <TabsTrigger value="quality">
            Qualité des données
            {(dataQuality.datesInvalides > 0 || 
              dataQuality.refsVides > 0 || 
              dataQuality.facturesSansDevis > 0) && (
              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-warning-foreground">
                !
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pieces">
          {/* Filters */}
          <div className="mb-6">
            <FilterBar />
          </div>
          
          {/* Table */}
          <div className="rounded-xl border border-border bg-card">
            <ScrollArea className="h-[600px]">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th className="text-right">Total HT</th>
                    <th className="text-right">Solde dû</th>
                    <th>Représentant</th>
                    <th>Famille</th>
                    <th>Client</th>
                    <th>Réf.</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPieces.map((piece, index) => (
                    <tr key={index}>
                      <td>
                        <span className={getTypeBadgeClass(piece.type)}>
                          {piece.type}
                        </span>
                      </td>
                      <td className="text-muted-foreground">{piece.statut}</td>
                      <td>
                        {piece.datePiece 
                          ? format(piece.datePiece, 'dd/MM/yyyy', { locale: fr })
                          : '-'
                        }
                      </td>
                      <td className="text-right font-mono">
                        {formatCurrency(piece.totalHT)}
                      </td>
                      <td className="text-right font-mono">
                        {piece.soldeDu !== null 
                          ? formatCurrency(piece.soldeDu)
                          : '-'
                        }
                      </td>
                      <td>{piece.representant ?? '-'}</td>
                      <td>{piece.familleClients ?? '-'}</td>
                      <td className="max-w-[200px] truncate">{piece.client}</td>
                      <td className="text-muted-foreground">{piece.ref ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        </TabsContent>
        
        <TabsContent value="quality">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Total pièces */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total pièces</p>
                  <p className="text-2xl font-bold">{dataQuality.totalPieces}</p>
                </div>
              </div>
            </div>
            
            {/* Dates invalides */}
            <div className={cn(
              'rounded-xl border bg-card p-6',
              dataQuality.datesInvalides > 0 
                ? 'border-warning/50 bg-warning/5' 
                : 'border-border'
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-lg',
                  dataQuality.datesInvalides > 0 
                    ? 'bg-warning/10' 
                    : 'bg-success/10'
                )}>
                  {dataQuality.datesInvalides > 0 ? (
                    <AlertTriangle className="h-6 w-6 text-warning" />
                  ) : (
                    <CheckCircle className="h-6 w-6 text-success" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dates invalides</p>
                  <p className="text-2xl font-bold">{dataQuality.datesInvalides}</p>
                </div>
              </div>
              {dataQuality.datesInvalides > 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Ces pièces ne seront pas prises en compte dans les filtres par date.
                </p>
              )}
            </div>
            
            {/* Refs vides */}
            <div className={cn(
              'rounded-xl border bg-card p-6',
              dataQuality.refsVides > 0 
                ? 'border-warning/50 bg-warning/5' 
                : 'border-border'
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-lg',
                  dataQuality.refsVides > 0 
                    ? 'bg-warning/10' 
                    : 'bg-success/10'
                )}>
                  {dataQuality.refsVides > 0 ? (
                    <AlertTriangle className="h-6 w-6 text-warning" />
                  ) : (
                    <CheckCircle className="h-6 w-6 text-success" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Références vides</p>
                  <p className="text-2xl font-bold">{dataQuality.refsVides}</p>
                </div>
              </div>
              {dataQuality.refsVides > 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Le calcul du cycle de vente peut être imprécis pour ces pièces.
                </p>
              )}
            </div>
            
            {/* Factures sans devis */}
            <div className={cn(
              'rounded-xl border bg-card p-6',
              dataQuality.facturesSansDevis > 0 
                ? 'border-info/50 bg-info/5' 
                : 'border-border'
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-lg',
                  dataQuality.facturesSansDevis > 0 
                    ? 'bg-info/10' 
                    : 'bg-success/10'
                )}>
                  {dataQuality.facturesSansDevis > 0 ? (
                    <AlertTriangle className="h-6 w-6 text-info" />
                  ) : (
                    <CheckCircle className="h-6 w-6 text-success" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Factures sans devis</p>
                  <p className="text-2xl font-bold">{dataQuality.facturesSansDevis}</p>
                </div>
              </div>
              {dataQuality.facturesSansDevis > 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Ces factures n'ont pas de devis avec même client+référence.
                </p>
              )}
            </div>
            
            {/* Devis sans client */}
            <div className={cn(
              'rounded-xl border bg-card p-6',
              dataQuality.devisSansClient > 0 
                ? 'border-destructive/50 bg-destructive/5' 
                : 'border-border'
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-lg',
                  dataQuality.devisSansClient > 0 
                    ? 'bg-destructive/10' 
                    : 'bg-success/10'
                )}>
                  {dataQuality.devisSansClient > 0 ? (
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  ) : (
                    <CheckCircle className="h-6 w-6 text-success" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Devis sans client</p>
                  <p className="text-2xl font-bold">{dataQuality.devisSansClient}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
