import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useData } from '@/contexts/DataContext';
import { formatCurrency, formatPercent } from '@/lib/kpiCalculator';

const CHART_COLORS = [
  'hsl(217, 91%, 50%)',
  'hsl(174, 72%, 40%)',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(262, 83%, 58%)',
  'hsl(0, 84%, 60%)',
];

export function CAParMoisChart() {
  const { kpis } = useData();
  
  if (!kpis || kpis.caParMois.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="mb-4 font-semibold">CA Net par mois</h3>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Aucune donnée disponible
        </div>
      </div>
    );
  }
  
  return (
    <div className="chart-container">
      <h3 className="mb-4 font-semibold">CA Net par mois</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={kpis.caParMois}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="mois" 
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), 'CA Net']}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="ca" radius={[4, 4, 0, 0]}>
            {kpis.caParMois.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[0]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PipelineChart() {
  const { kpis } = useData();
  
  if (!kpis || kpis.pipelineParStatut.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="mb-4 font-semibold">Pipeline par statut</h3>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Aucune donnée disponible
        </div>
      </div>
    );
  }
  
  return (
    <div className="chart-container">
      <h3 className="mb-4 font-semibold">Pipeline par statut</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={kpis.pipelineParStatut} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            type="number"
            tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            type="category"
            dataKey="statut"
            width={100}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), 'Montant']}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="montant" radius={[0, 4, 4, 0]}>
            {kpis.pipelineParStatut.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CAParCommercialChart() {
  const { kpis } = useData();
  
  const data = kpis 
    ? Object.entries(kpis.caParCommercial).map(([commercial, ca]) => ({
        commercial,
        ca,
      }))
    : [];
  
  if (data.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="mb-4 font-semibold">CA par commercial</h3>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Aucune donnée disponible
        </div>
      </div>
    );
  }
  
  return (
    <div className="chart-container">
      <h3 className="mb-4 font-semibold">CA par commercial</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            type="number"
            tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            type="category"
            dataKey="commercial"
            width={120}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), 'CA Net']}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="ca" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TransformationChart() {
  const { kpis } = useData();
  
  if (!kpis || kpis.transformationParMois.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="mb-4 font-semibold">Taux de transformation</h3>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Aucune donnée disponible
        </div>
      </div>
    );
  }
  
  return (
    <div className="chart-container">
      <h3 className="mb-4 font-semibold">Taux de transformation</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={kpis.transformationParMois}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="mois"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            tickFormatter={(val) => `${val.toFixed(0)}%`}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            formatter={(value: number) => [formatPercent(value), 'Taux']}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Line 
            type="monotone" 
            dataKey="taux" 
            stroke={CHART_COLORS[1]}
            strokeWidth={2}
            dot={{ fill: CHART_COLORS[1], strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
