/**
 * Agrégations district / région / national à partir des complétudes par établissement.
 * La règle utilisée est : agrégat = (Σ nbRecu, plafonné par établissement à sa cible) / (Σ nbAttendu).
 * On plafonne par établissement pour ne pas laisser un excès local artificiellement
 * gonfler la moyenne (un doublon ne compense pas un établissement à zéro).
 */

import type { FormulaireId } from '@/lib/referentiel/types';
import type { CompletudeEtablissement } from './types';
import { determinerStatut } from './statut';

export interface AgregatCompletude {
  formulaireId: FormulaireId;
  cle: string; // districtCode, regionCode, ou 'NATIONAL'
  nbAttendu: number;
  nbRecu: number;
  nbRecuPlafond: number;
  taux: number | null;
  statut: ReturnType<typeof determinerStatut>;
  nbEtablissements: number;
}

export function agregerParCle(
  formulaireId: FormulaireId,
  completudes: CompletudeEtablissement[],
  cle: string,
): AgregatCompletude {
  let nbAttendu = 0;
  let nbRecu = 0;
  let nbRecuPlafond = 0;
  for (const c of completudes) {
    if (c.nbAttendu !== null && c.nbAttendu > 0) {
      nbAttendu += c.nbAttendu;
      nbRecu += c.nbRecu;
      nbRecuPlafond += Math.min(c.nbRecu, c.nbAttendu);
    }
  }
  const taux = nbAttendu > 0 ? nbRecuPlafond / nbAttendu : null;
  return {
    formulaireId,
    cle,
    nbAttendu,
    nbRecu,
    nbRecuPlafond,
    taux,
    statut: determinerStatut(taux),
    nbEtablissements: completudes.length,
  };
}
