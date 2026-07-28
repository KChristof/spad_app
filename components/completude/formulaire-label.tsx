import { getFormulaireConfig } from '@/lib/kobo/formulaires';
import type { FormulaireId } from '@/lib/referentiel/types';
import { cn } from '@/lib/utils';

/**
 * Affiche le libellé complet d'un formulaire — jamais le code brut (F7/F07
 * sont visuellement trop proches). Deux tailles disponibles.
 */
export function FormulaireLabel({
  id,
  size = 'md',
  className,
}: {
  id: FormulaireId;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const cfg = getFormulaireConfig(id);
  return (
    <span className={cn('inline-flex items-center', size === 'sm' ? 'text-xs' : 'text-sm', className)}
          title={cfg.libelle}>
      {size === 'sm' ? cfg.libelleCourt : cfg.libelle}
    </span>
  );
}
