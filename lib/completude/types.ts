import type { FormulaireId } from '@/lib/referentiel/types';

export type StatutCompletude =
  | 'zero'         // rouge — 0 %
  | 'partiel'      // orange — 1..99 %
  | 'plein'        // vert — cible atteinte (100 % ou plancher F07 atteint)
  | 'exces'        // violet — au-delà de la cible (F5/F6/F7/F8 uniquement — jamais pour F07)
  | 'nonConcerne'  // gris — établissement hors périmètre F02 (aucun décès notifié)
  | 'neutre';      // gris — formulaire pas encore déployé, cible non applicable

export interface CompletudeF6Detail {
  attendus: string[];       // ex. ['medecin','infirmier','sage_femme_ou_maieuticien']
  obtenus: string[];         // professions distinctes soumises
  manquants: string[];       // attendus \ obtenus
  doublons: string[];        // professions soumises plusieurs fois
}

export interface CompletudeEtablissement {
  etablissementCode: string;
  formulaireId: FormulaireId;
  nbAttendu: number | null;  // null si formulaire sans cible fixe (F07) ou pas applicable
  nbRecu: number;
  taux: number | null;       // null si nbAttendu null ou 0
  statut: StatutCompletude;
  anomalies: string[];
  detailF6?: CompletudeF6Detail;
}

export interface CompletudeDistrict {
  districtCode: string;
  formulaireId: FormulaireId;
  nbAttendu: number | null;
  nbRecu: number;
  taux: number | null;
  statut: StatutCompletude;
}

export interface CompletudeGlobale {
  formulaireId: FormulaireId;
  nbAttendu: number | null;
  nbRecu: number;
  taux: number | null;
  statut: StatutCompletude;
}

export interface F07Coherence {
  districtCode: string;
  nbF07: number;
  nbDecesRevusDeclaresF01: number;
  nbDecesRevusDeclaresF02: number;
  ecart: number; // (max des deux — F07) ; >0 => revues manquantes
  statut: 'ok' | 'ecart';
}
