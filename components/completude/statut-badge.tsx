import { cn } from '@/lib/utils';
import { classesBadgeStatut, libelleStatut } from '@/lib/completude/statut';
import type { StatutCompletude } from '@/lib/completude/types';

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
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium',
        classesBadgeStatut(statut),
      )}
      title={libelleStatut(statut)}
    >
      <span
        aria-hidden
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          statut === 'zero' && 'bg-statut-zero',
          statut === 'partiel' && 'bg-statut-partiel',
          statut === 'plein' && 'bg-statut-plein',
          statut === 'exces' && 'bg-statut-exces',
          statut === 'neutre' && 'bg-statut-neutre',
        )}
      />
      {compact ? labelTaux : `${labelTaux}`}
    </span>
  );
}

export function BadgeNonDeploye() {
  return (
    <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium bg-statut-neutre/15 text-statut-neutre border-statut-neutre/30">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-statut-neutre" />
      Pas encore déployé
    </span>
  );
}
