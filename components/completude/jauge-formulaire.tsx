import { Progress } from '@/components/ui/progress';
import { StatutBadge, BadgeNonDeploye } from './statut-badge';
import { formatInt, formatPercent } from '@/lib/utils';
import type { FormulaireId } from '@/lib/referentiel/types';
import type { StatutCompletude } from '@/lib/completude/types';

const COULEURS: Record<StatutCompletude, string> = {
  zero: 'hsl(0 78% 55%)',
  partiel: 'hsl(28 92% 55%)',
  plein: 'hsl(142 62% 42%)',
  exces: 'hsl(265 70% 55%)',
  neutre: 'hsl(220 10% 60%)',
};

export function JaugeFormulaire({
  id,
  libelle,
  taux,
  statut,
  nbRecu,
  nbAttendu,
  deploye,
}: {
  id: FormulaireId;
  libelle: string;
  taux: number | null;
  statut: StatutCompletude;
  nbRecu: number;
  nbAttendu: number | null;
  deploye: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{id}</div>
          <div className="mt-0.5 text-sm font-medium">{libelle}</div>
        </div>
        {!deploye ? <BadgeNonDeploye /> : <StatutBadge statut={statut} taux={taux} compact />}
      </div>
      {!deploye ? (
        <div className="mt-3 text-xs text-muted-foreground">
          Ce formulaire n&rsquo;a pas encore d&rsquo;asset UID configuré.
          Il basculera automatiquement en suivi actif dès que la variable
          d&rsquo;environnement sera renseignée sur Vercel.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <Progress value={taux !== null ? Math.min(100, taux * 100) : 0} color={COULEURS[statut]} />
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">
              {formatInt(nbRecu)} / {nbAttendu !== null ? formatInt(nbAttendu) : '—'} soumissions
            </span>
            <span className="num-cell text-sm font-semibold">
              {taux !== null ? formatPercent(taux) : '—'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
