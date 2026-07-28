import type { StatutCompletude } from './types';

/**
 * Détermine le statut couleur d'une complétude (voir spec section 4).
 *  - taux === null  => neutre (pas de cible fixe applicable)
 *  - taux === 0     => zero (rouge)
 *  - 0 < taux < 1   => partiel (orange)
 *  - taux === 1     => plein (vert)
 *  - taux > 1       => exces (violet — à examiner, doublons possibles)
 *
 * NB : le statut « nonConcerne » n'est jamais dérivé d'un taux — il est
 * assigné explicitement par la fonction métier (ex. F02 pour un établissement
 * qui n'a pas notifié de décès au SIG).
 */
export function determinerStatut(taux: number | null): StatutCompletude {
  if (taux === null || Number.isNaN(taux)) return 'neutre';
  if (taux === 0) return 'zero';
  if (taux < 1) return 'partiel';
  if (taux === 1) return 'plein';
  return 'exces';
}

/**
 * Variante pour F07 (voir spec Affinement §2) : la cible est un plancher.
 *  - reçu === 0                 => zero (rouge)
 *  - 0 < reçu < cible           => partiel (orange)
 *  - reçu >= cible              => plein (vert) — dépasser est NORMAL, pas « excès »
 *  - cible === 0                => neutre (pas de décès à revoir)
 */
export function determinerStatutF07(recu: number, cible: number): StatutCompletude {
  if (cible === 0) return 'neutre';
  if (recu === 0) return 'zero';
  if (recu < cible) return 'partiel';
  return 'plein';
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
    case 'nonConcerne':
      return 'bg-statut-neutre/10 text-statut-neutre border-statut-neutre/20 italic';
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
    case 'nonConcerne':
      return 'Non concerné';
    case 'neutre':
    default:
      return 'Non applicable';
  }
}
