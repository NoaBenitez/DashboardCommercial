import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Link } from 'react-router-dom';

export function DataQualityBadge() {
  const { dataQuality } = useData();
  
  if (!dataQuality) return null;
  
  const issues = 
    dataQuality.datesInvalides +
    dataQuality.refsVides +
    dataQuality.facturesSansDevis +
    dataQuality.devisSansClient;
  
  const isGood = issues === 0;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/data"
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            isGood 
              ? 'bg-success/10 text-success hover:bg-success/20' 
              : 'bg-warning/10 text-warning hover:bg-warning/20'
          }`}
        >
          {isGood ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span>
            {isGood ? 'Données OK' : `${issues} alerte${issues > 1 ? 's' : ''}`}
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1 text-sm">
          <p><strong>{dataQuality.totalPieces}</strong> pièces importées</p>
          {dataQuality.datesInvalides > 0 && (
            <p className="text-warning">
              {dataQuality.datesInvalides} dates invalides
            </p>
          )}
          {dataQuality.refsVides > 0 && (
            <p className="text-warning">
              {dataQuality.refsVides} références vides
            </p>
          )}
          {dataQuality.facturesSansDevis > 0 && (
            <p className="text-warning">
              {dataQuality.facturesSansDevis} factures sans devis lié
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
