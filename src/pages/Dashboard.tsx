import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Euro, 
  Target, 
  TrendingUp, 
  Users, 
  Percent, 
  ShoppingCart,
  Layers,
  Calculator,
  Clock,
  Download
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { KPICard } from '@/components/dashboard/KPICard';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { DataQualityBadge } from '@/components/dashboard/DataQualityBadge';
import {
  CAParMoisChart,
  PipelineChart,
  CAParCommercialChart,
  TransformationChart,
} from '@/components/dashboard/Charts';
import { formatCurrency, formatPercent, formatNumber, formatPeriodLabel } from '@/lib/kpiCalculator';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  exportKPIsToCSV, 
  exportKPIsToJSON, 
  downloadFile 
} from '@/lib/exportUtils';

export default function Dashboard() {
  const { hasData, isRestoring, kpis, settings, filters } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isRestoring && !hasData) {
      navigate('/');
    }
  }, [hasData, isRestoring, navigate]);

  if (isRestoring || !hasData || !kpis) {
    return null;
  }
  
  const periodLabel = formatPeriodLabel(filters.dateDebut, filters.dateFin);
  
  const handleExport = (format: 'csv' | 'json') => {
    const content = format === 'csv' 
      ? exportKPIsToCSV(kpis)
      : exportKPIsToJSON(kpis);
    const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
    downloadFile(content, `kpis-export.${format}`, mimeType);
  };
  
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de vos indicateurs commerciaux
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <DataQualityBadge />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Exporter en CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                Exporter en JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Filters */}
      <div className="mb-8">
        <FilterBar />
      </div>
      
      {/* KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KPICard
          label="CA Net"
          value={formatCurrency(kpis.caNet)}
          periodLabel={periodLabel}
          tooltip="Somme des factures moins les avoirs sur la période sélectionnée"
          icon={<Euro className="h-5 w-5" />}
        />
        
        <KPICard
          label="Taux d'atteinte"
          value={formatPercent(kpis.tauxAtteinte)}
          periodLabel={periodLabel}
          subValue={settings.objectifCA > 0 
            ? `Objectif: ${formatCurrency(settings.objectifCA)}`
            : 'Objectif non défini'
          }
          tooltip="Pourcentage de réalisation de l'objectif CA"
          variant={kpis.tauxAtteinte >= 100 ? 'success' : 'default'}
          icon={<Target className="h-5 w-5" />}
        />
        
        <KPICard
          label="Marge"
          value={formatCurrency(kpis.marge)}
          periodLabel={periodLabel}
          subValue={`${formatPercent(kpis.margePercent)} du CA`}
          tooltip="Marge calculée selon le mode sélectionné (taux ou coût)"
          variant="success"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        
        <KPICard
          label="Leads entrants"
          value={formatNumber(kpis.leadsEntrants)}
          periodLabel={periodLabel}
          tooltip="Nombre de devis créés sur la période"
          icon={<Users className="h-5 w-5" />}
        />
        
        <KPICard
          label="Taux transformation"
          value={formatPercent(kpis.tauxTransformation)}
          periodLabel={periodLabel}
          tooltip="Pourcentage de devis convertis (statut Accepté)"
          variant="accent"
          icon={<Percent className="h-5 w-5" />}
        />
        
        <KPICard
          label="Panier moyen"
          value={formatCurrency(kpis.panierMoyen)}
          periodLabel={periodLabel}
          tooltip="CA net divisé par le nombre de factures"
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        
        <KPICard
          label="Pipeline"
          value={formatCurrency(kpis.pipeline)}
          periodLabel={periodLabel}
          tooltip="Total des devis avec statuts vivants"
          icon={<Layers className="h-5 w-5" />}
        />
        
        <KPICard
          label="Forecast pondéré"
          value={formatCurrency(kpis.forecastPondere)}
          periodLabel={periodLabel}
          tooltip="Pipeline pondéré par probabilité de conversion"
          icon={<Calculator className="h-5 w-5" />}
        />
        
        <KPICard
          label="Cycle de vente"
          value={kpis.cycleVenteMoyen 
            ? `${formatNumber(kpis.cycleVenteMoyen)} jours`
            : 'N/A'
          }
          periodLabel={periodLabel}
          tooltip="Durée moyenne entre devis et facture (même client+ref)"
          icon={<Clock className="h-5 w-5" />}
        />
      </div>
      
      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CAParMoisChart />
        <PipelineChart />
        <CAParCommercialChart />
        <TransformationChart />
      </div>
    </div>
  );
}
