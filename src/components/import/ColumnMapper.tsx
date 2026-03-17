import { useState } from 'react';
import { Check, AlertTriangle, ArrowRight } from 'lucide-react';
import { ColumnMapping } from '@/lib/fileParser';
import { Piece } from '@/types/sage';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const AVAILABLE_FIELDS: { value: keyof Piece | '__none__'; label: string; required?: boolean }[] = [
  { value: '__none__', label: '— Ignorer —' },
  { value: 'type', label: 'Type de pièce', required: true },
  { value: 'statut', label: 'Statut' },
  { value: 'datePiece', label: 'Date pièce', required: true },
  { value: 'totalHT', label: 'Total HT', required: true },
  { value: 'totalTTC', label: 'Total TTC' },
  { value: 'totalTVA', label: 'Total TVA' },
  { value: 'soldeDu', label: 'Solde dû' },
  { value: 'familleClients', label: 'Famille clients' },
  { value: 'representant', label: 'Commercial / Représentant' },
  { value: 'client', label: 'Client', required: true },
  { value: 'ref', label: 'Référence' },
  { value: 'numPiece', label: 'N° Pièce' },
];

interface ColumnMapperProps {
  mapping: ColumnMapping[];
  onMappingChange: (mapping: ColumnMapping[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
  previewData?: Record<string, unknown>[];
}

export function ColumnMapper({
  mapping,
  onMappingChange,
  onConfirm,
  onCancel,
  previewData = [],
}: ColumnMapperProps) {
  const [localMapping, setLocalMapping] = useState(mapping);

  const handleFieldChange = (sourceColumn: string, targetField: string) => {
    const newMapping = localMapping.map(m => {
      if (m.sourceColumn === sourceColumn) {
        return {
          ...m,
          targetField: targetField === '__none__' ? null : (targetField as keyof Piece),
          confidence: 1, // User override
        };
      }
      // Remove duplicate mappings
      if (m.targetField && m.targetField === targetField) {
        return { ...m, targetField: null, confidence: 0 };
      }
      return m;
    });
    setLocalMapping(newMapping);
    onMappingChange(newMapping);
  };

  const getMappedFields = () => {
    return new Set(localMapping.filter(m => m.targetField).map(m => m.targetField));
  };

  const mappedFields = getMappedFields();
  const requiredFields = AVAILABLE_FIELDS.filter(f => f.required && f.value !== '__none__').map(f => f.value);
  const missingRequired = requiredFields.filter(f => f !== '__none__' && !mappedFields.has(f as keyof Piece));

  const getPreviewValue = (column: string): string => {
    if (previewData.length === 0) return '';
    const value = previewData[0][column];
    if (value === null || value === undefined) return '';
    return String(value).slice(0, 30) + (String(value).length > 30 ? '...' : '');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Configuration des colonnes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          L'IA a détecté automatiquement les correspondances. Vérifiez et ajustez si nécessaire.
        </p>
      </div>

      {/* Missing required fields warning */}
      {missingRequired.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg bg-warning/10 p-4 text-warning">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Colonnes requises manquantes</p>
            <p className="text-sm opacity-90">
              {missingRequired.map(f => 
                AVAILABLE_FIELDS.find(af => af.value === f)?.label
              ).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Mapping table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[1fr,auto,1fr,1fr] gap-4 border-b border-border bg-muted px-4 py-3 text-sm font-medium text-muted-foreground">
          <div>Colonne source</div>
          <div></div>
          <div>Champ cible</div>
          <div>Aperçu</div>
        </div>

        <div className="divide-y divide-border">
          {localMapping.map((m) => (
            <div
              key={m.sourceColumn}
              className="grid grid-cols-[1fr,auto,1fr,1fr] items-center gap-4 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{m.sourceColumn}</span>
                {m.confidence >= 0.8 && m.targetField && (
                  <span className="badge-status success">
                    <Check className="mr-1 h-3 w-3" />
                    Auto
                  </span>
                )}
              </div>

              <ArrowRight className="h-4 w-4 text-muted-foreground" />

              <Select
                value={m.targetField ?? '__none__'}
                onValueChange={(val) => handleFieldChange(m.sourceColumn, val)}
              >
                <SelectTrigger className={cn(
                  'w-full',
                  !m.targetField && 'text-muted-foreground'
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_FIELDS.map((field) => {
                    const isUsed = mappedFields.has(field.value as keyof Piece) && 
                                   m.targetField !== field.value;
                    return (
                      <SelectItem
                        key={field.value}
                        value={field.value}
                        disabled={isUsed && field.value !== '__none__'}
                      >
                        <span className={cn(isUsed && 'text-muted-foreground')}>
                          {field.label}
                          {field.required && <span className="text-destructive"> *</span>}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <div className="truncate text-sm text-muted-foreground font-mono">
                {getPreviewValue(m.sourceColumn) || '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button 
          onClick={onConfirm}
          disabled={missingRequired.length > 0}
        >
          Importer {previewData.length} lignes
        </Button>
      </div>
    </div>
  );
}
