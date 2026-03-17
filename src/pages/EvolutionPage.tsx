import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  Pencil,
  Check,
  X,
  History,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
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
  Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { ImportSnapshot } from '@/types/sage';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/kpiCalculator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface KpiDef {
  key: keyof ImportSnapshot['kpis'];
  label: string;
  format: (v: number) => string;
  suffix?: string;
  higherIsBetter: boolean;
}

const KPI_DEFS: KpiDef[] = [
  { key: 'caNet', label: 'CA Net', format: formatCurrency, higherIsBetter: true },
  { key: 'marge', label: 'Marge', format: formatCurrency, higherIsBetter: true },
  { key: 'margePercent', label: 'Marge %', format: formatPercent, higherIsBetter: true },
  { key: 'leadsEntrants', label: 'Leads', format: formatNumber, higherIsBetter: true },
  { key: 'tauxTransformation', label: 'Taux transfo.', format: formatPercent, higherIsBetter: true },
  { key: 'panierMoyen', label: 'Panier moyen', format: formatCurrency, higherIsBetter: true },
  { key: 'pipeline', label: 'Pipeline', format: formatCurrency, higherIsBetter: true },
  { key: 'forecastPondere', label: 'Forecast', format: formatCurrency, higherIsBetter: true },
  { key: 'cycleVenteMoyen', label: 'Cycle vente', format: (v) => v ? `${formatNumber(v)} j` : 'N/A', higherIsBetter: false },
];

function EvolutionBadge({ current, previous, higherIsBetter }: { current: number; previous: number; higherIsBetter: boolean }) {
  if (previous === 0 && current === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;

  const diff = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : 100;
  const isPositive = higherIsBetter ? diff > 0 : diff < 0;
  const isNeutral = Math.abs(diff) < 0.5;

  if (isNeutral) return <Minus className="h-4 w-4 text-muted-foreground" />;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
      isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    )}>
      {diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
    </span>
  );
}

function SnapshotLabel({ snapshot, onRename, onDelete }: {
  snapshot: ImportSnapshot;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(snapshot.label);

  const handleSave = () => {
    if (value.trim()) {
      onRename(snapshot.id, value.trim());
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          className="rounded border px-2 py-0.5 text-sm"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          autoFocus
        />
        <button onClick={handleSave} className="text-green-600 hover:text-green-800"><Check className="h-4 w-4" /></button>
        <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{snapshot.label}</span>
      <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
      <button onClick={() => onDelete(snapshot.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
    </div>
  );
}

export default function EvolutionPage() {
  const { importHistory, deleteSnapshot, renameSnapshot, loadSession } = useData();
  const navigate = useNavigate();
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);

  if (importHistory.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-8">
        <div className="text-center animate-fade-in">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <History className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">Aucun historique</h1>
          <p className="text-muted-foreground">
            Importez au moins un fichier pour commencer à suivre l'évolution de vos KPIs.
          </p>
        </div>
      </div>
    );
  }

  const snapshotA = importHistory.find(s => s.id === selectedA) ?? null;
  const snapshotB = importHistory.find(s => s.id === selectedB) ?? null;

  // Chart data: evolution of main KPIs across all imports
  const chartData = importHistory.map((s, i) => ({
    name: `#${i + 1}`,
    label: s.label,
    caNet: s.kpis.caNet,
    marge: s.kpis.marge,
    pipeline: s.kpis.pipeline,
    leads: s.kpis.leadsEntrants,
    tauxTransfo: s.kpis.tauxTransformation,
  }));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Évolution</h1>
        <p className="text-muted-foreground">
          Suivez l'évolution de vos KPIs entre chaque import ({importHistory.length} import{importHistory.length > 1 ? 's' : ''} enregistré{importHistory.length > 1 ? 's' : ''})
        </p>
      </div>

      {/* Evolution Charts */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="chart-container">
          <h3 className="mb-4 font-semibold">Évolution du CA Net & Marge</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name === 'caNet' ? 'CA Net' : name === 'marge' ? 'Marge' : 'Pipeline']}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
              />
              <Legend />
              <Line type="monotone" dataKey="caNet" name="CA Net" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="marge" name="Marge" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="pipeline" name="Pipeline" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3 className="mb-4 font-semibold">Évolution Leads & Taux de transformation</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="leads" name="Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="tauxTransfo" name="Taux transfo. %" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 4 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparison Selector */}
      <div className="mb-6 rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">Comparer deux imports</h3>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Import précédent</label>
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={selectedA ?? ''}
              onChange={e => setSelectedA(e.target.value || null)}
            >
              <option value="">Sélectionner...</option>
              {importHistory.map((s, i) => (
                <option key={s.id} value={s.id}>#{i + 1} — {s.label}</option>
              ))}
            </select>
          </div>

          <ArrowRight className="mt-4 h-5 w-5 text-muted-foreground" />

          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Import actuel</label>
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={selectedB ?? ''}
              onChange={e => setSelectedB(e.target.value || null)}
            >
              <option value="">Sélectionner...</option>
              {importHistory.map((s, i) => (
                <option key={s.id} value={s.id}>#{i + 1} — {s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      {snapshotA && snapshotB && (
        <div className="mb-8 overflow-hidden rounded-xl border bg-card animate-fade-in">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">KPI</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {snapshotA.label}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {snapshotB.label}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Évolution</th>
              </tr>
            </thead>
            <tbody>
              {KPI_DEFS.map(kpi => {
                const valA = (snapshotA.kpis[kpi.key] as number) ?? 0;
                const valB = (snapshotB.kpis[kpi.key] as number) ?? 0;
                return (
                  <tr key={kpi.key} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium">{kpi.label}</td>
                    <td className="px-6 py-3 text-right text-sm tabular-nums">{kpi.format(valA)}</td>
                    <td className="px-6 py-3 text-right text-sm font-semibold tabular-nums">{kpi.format(valB)}</td>
                    <td className="px-6 py-3 text-center">
                      <EvolutionBadge current={valB} previous={valA} higherIsBetter={kpi.higherIsBetter} />
                    </td>
                  </tr>
                );
              })}
              {/* Meta rows */}
              <tr className="border-t-2 border-b hover:bg-muted/30 transition-colors">
                <td className="px-6 py-3 text-sm font-medium">Nb pièces</td>
                <td className="px-6 py-3 text-right text-sm tabular-nums">{snapshotA.meta.totalPieces}</td>
                <td className="px-6 py-3 text-right text-sm font-semibold tabular-nums">{snapshotB.meta.totalPieces}</td>
                <td className="px-6 py-3 text-center">
                  <EvolutionBadge current={snapshotB.meta.totalPieces} previous={snapshotA.meta.totalPieces} higherIsBetter={true} />
                </td>
              </tr>
              <tr className="border-b hover:bg-muted/30 transition-colors">
                <td className="px-6 py-3 text-sm font-medium">Nb clients</td>
                <td className="px-6 py-3 text-right text-sm tabular-nums">{snapshotA.meta.nbClients}</td>
                <td className="px-6 py-3 text-right text-sm font-semibold tabular-nums">{snapshotB.meta.nbClients}</td>
                <td className="px-6 py-3 text-center">
                  <EvolutionBadge current={snapshotB.meta.nbClients} previous={snapshotA.meta.nbClients} higherIsBetter={true} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Import History List */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h3 className="font-semibold">Historique des imports</h3>
        </div>
        <div className="divide-y">
          {importHistory.map((snapshot, index) => (
            <div key={snapshot.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </span>
                <div>
                  <SnapshotLabel snapshot={snapshot} onRename={renameSnapshot} onDelete={deleteSnapshot} />
                  <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                    <span>{snapshot.meta.totalPieces} pièces</span>
                    <span>{snapshot.meta.nbFactures} factures</span>
                    <span>{snapshot.meta.nbDevis} devis</span>
                    <span>{snapshot.meta.nbClients} clients</span>
                    <span>CA: {formatCurrency(snapshot.kpis.caNet)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await loadSession(snapshot.id);
                    navigate('/dashboard');
                  }}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Charger
                </Button>
                <div className="text-right text-xs text-muted-foreground">
                  {new Date(snapshot.date).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
