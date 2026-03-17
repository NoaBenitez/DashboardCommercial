import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DocPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const kpiDocs = [
  {
    name: 'CA Net',
    formula: 'SUM(Facture.totalHT) - SUM(Avoir.totalHT)',
    description: "Chiffre d'affaires net réalisé sur la période, calculé comme la somme des factures moins les avoirs.",
    hypotheses: ['Seuls les types "Facture" et "Avoir" sont pris en compte', 'Les montants sont en HT'],
  },
  {
    name: "Taux d'atteinte",
    formula: 'CA_net / Objectif_CA × 100',
    description: "Pourcentage de réalisation de l'objectif de CA défini dans les paramètres.",
    hypotheses: ['Objectif défini dans Paramètres > Objectif CA', 'Retourne 0 si aucun objectif'],
  },
  {
    name: 'Marge',
    formula: 'Mode taux: CA × taux_famille | Mode coût: CA - coûts',
    description: 'Marge calculée selon le mode choisi (taux par famille ou coûts réels).',
    hypotheses: ['Taux de marge par famille configurables', 'Coûts par pièce en mode coût'],
  },
  {
    name: 'Leads entrants',
    formula: 'COUNT(Devis)',
    description: 'Nombre de devis créés sur la période, représentant les opportunités commerciales.',
    hypotheses: ['Tous les devis sont comptés', 'Indépendant du statut'],
  },
  {
    name: 'Taux de transformation',
    formula: 'Devis_acceptés / Total_devis × 100',
    description: 'Pourcentage de devis convertis en commandes/factures.',
    hypotheses: ['Statut contenant "Accepté" = devis transformé', 'Sensible à la casse'],
  },
  {
    name: 'Panier moyen',
    formula: 'CA_net / Nombre_factures',
    description: 'Valeur moyenne par transaction facturée.',
    hypotheses: ['Basé sur le CA net et le nombre de factures', 'Les avoirs réduisent le CA mais pas le nombre'],
  },
  {
    name: 'Pipeline',
    formula: 'SUM(Devis.totalHT) pour statuts vivants',
    description: 'Valeur totale des devis en cours de négociation.',
    hypotheses: ['Statuts pipeline configurables', 'Par défaut: A envoyer, En-cours, A relancer, Accepté'],
  },
  {
    name: 'Forecast pondéré',
    formula: 'SUM(Devis.totalHT × poids_statut)',
    description: 'Prévision de CA pondérée par la probabilité de conversion.',
    hypotheses: [
      'Pondérations par statut configurables',
      'Défaut: Accepté 90%, En-cours 50%, A relancer 30%, A envoyer 20%',
    ],
  },
  {
    name: 'Cycle de vente',
    formula: 'MOYENNE(date_facture - date_dernier_devis)',
    description: 'Durée moyenne entre le devis et la facture pour une même affaire.',
    hypotheses: [
      'Lien devis-facture basé sur client + référence',
      'Seul le dernier devis avant la facture est considéré',
      'Recherche binaire optimisée',
    ],
  },
  {
    name: 'CA par commercial',
    formula: 'CA_net filtré par représentant',
    description: 'Répartition du CA net par commercial/représentant.',
    hypotheses: ['Utilise le champ "Représentant"', '"Non assigné" si vide'],
  },
];

export function DocPanel({ isOpen, onClose }: DocPanelProps) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      
      {/* Panel */}
      <div className={cn('doc-panel', isOpen && 'open')}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">Documentation KPI</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="space-y-6 p-6">
              {kpiDocs.map((doc) => (
                <div key={doc.name} className="space-y-2">
                  <h3 className="font-semibold text-primary">{doc.name}</h3>
                  <p className="text-sm text-muted-foreground">{doc.description}</p>
                  
                  <div className="rounded-lg bg-muted p-3">
                    <p className="font-mono text-xs text-foreground">{doc.formula}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Hypothèses
                    </p>
                    <ul className="space-y-1">
                      {doc.hypotheses.map((h, i) => (
                        <li key={i} className="text-xs text-muted-foreground">
                          • {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
              
              <div className="border-t border-border pt-6">
                <h3 className="mb-3 font-semibold">Statuts Pipeline</h3>
                <p className="text-sm text-muted-foreground">
                  Les statuts suivants sont considérés comme "vivants" pour le calcul du pipeline.
                  Vous pouvez les modifier dans Paramètres.
                </p>
                <ul className="mt-2 space-y-1">
                  <li className="text-sm">• A envoyer</li>
                  <li className="text-sm">• En-cours</li>
                  <li className="text-sm">• A relancer</li>
                  <li className="text-sm">• Accepté</li>
                </ul>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}
