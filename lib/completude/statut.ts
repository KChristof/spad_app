import type { StatutCompletude } from './types';

/**
 * Détermine le statut couleur d'une complétude (voir spec section 4).
 *  - taux === null  => neutre (pas de cible fixe applicable — F07 par ex.)
 *  - taux === 0     => zero (rouge)
 *  - 0 < taux < 1   => partiel (orange)
 *  - taux === 1     => plein (vert)
 *  - taux > 1       => exces (violet — à examiner, doublons possibles)
 */
export function determinerStatut(taux: number | null): StatutCompletude {
  if (taux === null || Number.isNaN(taux)) return 'neutre';
  if (taux === 0) return 'zero';
  if (taux < 1) return 'partiel';
  if (taux === 1) return 'plein';
  return 'exces';
}

/** Petites classes Tailwind pour badges. */
export function classesBadgeStatut(s: StatutCompletude): string {
  switch (s) {
    case 'zero':
      return 'bg-statut-zero/15 text-statut-zero border-statut-zero/30';
    case 'partiel':
      return 'bg-statut-partiel/15 text-statut-partiel border-statut-partiel/30';
    case 'plein':
      return 'bg-statut-plein/15 text-statut-plein border-statut-plein/30';
    case 'exces':
      return 'bg-statut-exces/15 text-statut-exces border-statut-exces/30';
    case 'neutre':
    default:
      return 'bg-statut-neutre/15 text-statut-neutre border-statut-neutre/30';
  }
}

export function libelleStatut(s: StatutCompletude): string {
  switch (s) {
    case 'zero':
      return '0 %';
    case 'partiel':
      return 'En cours';
    case 'plein':
      return 'Cible atteinte';
    case 'exces':
      return 'À vérifier';
    case 'neutre':
    default:
      return 'Non applicable';
  }
}
