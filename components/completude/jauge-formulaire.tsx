import { Progress } from '@/components/ui/progress';
import { StatutBadge, BadgeNonDeploye } from './statut-badge';
import { formatInt, formatPercent, cn } from '@/lib/utils';
import type { FormulaireId } from '@/lib/referentiel/types';
import type { StatutCompletude } from '@/lib/completude/types';

const COULEURS: Record<StatutCompletude, string> = {
  zero: 'hsl(0 78% 55%)',
  partiel: 'hsl(28 92% 55%)',
  plein: 'hsl(142 62% 42%)',
  exces: 'hsl(265 70% 55%)',
  nonConcerne: 'hsl(220 10% 65%)',
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
  index = 0,
}: {
  id: FormulaireId;
  libelle: string;
  taux: number | null;
  statut: StatutCompletude;
  nbRecu: number;
  nbAttendu: number | null;
  deploye: boolean;
  index?: number;
}) {
  const tooltipNonDeploye =
    'Ce formulaire n’a pas encore d’asset UID configuré. Il basculera automatiquement en suivi actif dès que la variable d’environnement KOBO_ASSET_UID_… sera renseignée sur Vercel.';
  return (
    <div
      className={cn(
        'group rounded-lg border bg-card p-4 transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30',
        'motion-safe:animate-[fadeInUp_.35s_ease-out_both]',
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      title={!deploye ? tooltipNonDeploye : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {id}
          </div>
          <div className="mt-0.5 text-sm font-medium leading-snug">{libelle}</div>
        </div>
        {!deploye ? <BadgeNonDeploye /> : <StatutBadge statut={statut} taux={taux} compact />}
      </div>
      {!deploye ? (
        <div className="mt-3 h-9 flex items-center text-xs text-muted-foreground">
          Bientôt disponible — survoler pour info.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <Progress value={taux !== null ? Math.min(100, taux * 100) : 0} color={COULEURS[statut]} />
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground tabular-nums">
              {formatInt(nbRecu)} / {nbAttendu !== null ? formatInt(nbAttendu) : '—'} soum.
            </span>
            <span className="num-cell text-sm font-semibold text-foreground">
              {taux !== null ? formatPercent(taux) : '—'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
