import { Info, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface KPICardProps {
  label: string;
  value: string;
  subValue?: string;
  periodLabel?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  tooltip: string;
  variant?: 'default' | 'success' | 'accent';
  icon?: React.ReactNode;
}

export function KPICard({
  label,
  value,
  subValue,
  periodLabel,
  trend,
  tooltip,
  variant = 'default',
  icon,
}: KPICardProps) {
  return (
    <div className={cn('kpi-card', variant)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="kpi-label">{label}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          {periodLabel && (
            <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{periodLabel}</span>
            </div>
          )}
          
          <div className="kpi-value">{value}</div>
          
          {subValue && (
            <p className="mt-1 text-sm text-muted-foreground">{subValue}</p>
          )}
          
          {trend && (
            <div className={cn(
              'kpi-trend mt-2',
              trend.isPositive ? 'up' : 'down'
            )}>
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
            </div>
          )}
        </div>
        
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
