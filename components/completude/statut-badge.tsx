import { cn } from '@/lib/utils';
import { classesBadgeStatut, libelleStatut } from '@/lib/completude/statut';
import type { StatutCompletude } from '@/lib/completude/types';
import {
  XCircle,
  Loader,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  Circle,
} from 'lucide-react';

/**
 * Statut = couleur + icône distincte. Un daltonien doit pouvoir distinguer
 * les 6 états rien qu'à la forme (spec Affinement Chantier 3).
 */
const ICONES: Record<StatutCompletude, typeof CheckCircle2> = {
  zero: XCircle,
  partiel: Loader,
  plein: CheckCircle2,
  exces: AlertTriangle,
  nonConcerne: MinusCircle,
  neutre: Circle,
};

export function StatutBadge({
  statut,
  taux,
  compact = false,
}: {
  statut: StatutCompletude;
  taux?: number | null;
  compact?: boolean;
}) {
  const labelTaux =
    taux !== undefined && taux !== null
      ? `${(taux * 100).toFixed(0)} %`
      : libelleStatut(statut);
  const Icone = ICONES[statut];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
        classesBadgeStatut(statut),
      )}
      title={libelleStatut(statut)}
    >
      <Icone
        aria-hidden
        className={cn(
          'h-3 w-3 shrink-0',
          statut === 'neutre' && 'stroke-dashed', // fallback si CSS custom absent
        )}
      />
      <span className="sr-only">{libelleStatut(statut)} : </span>
      {labelTaux}
    </span>
  );
}

export function BadgeNonDeploye() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium bg-statut-neutre/15 text-statut-neutre border-statut-neutre/30 whitespace-nowrap"
      title="Ce formulaire Kobo n'est pas encore déployé (asset UID non configuré)"
    >
      <Circle aria-hidden className="h-3 w-3 shrink-0" strokeDasharray="2 2" />
      <span className="sr-only">Pas encore déployé : </span>
      Pas déployé
    </span>
  );
}

/**
 * Badge informatif « Hors liste — décès potentiellement découvert sur le terrain »
 * (spec Chantier 5.2). Ton positif : c'est le but même de la RDM.
 */
export function BadgeHorsListeRdm() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/10 text-primary px-1.5 py-0.5 text-xs font-medium whitespace-nowrap"
      title="Fiche F02 soumise pour un établissement hors de la liste initiale — potentiellement un décès découvert sur le terrain."
    >
      <AlertTriangle aria-hidden className="h-3 w-3 shrink-0" />
      Hors liste — à consolider
    </span>
  );
}
