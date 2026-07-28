/**
 * Types du référentiel organisationnel SPAD.
 * Source: onglet `choices` des XLSForm Kobo (voir scripts/build-referentiel.ts).
 */

export type FormulaireId = 'F5' | 'F6' | 'F7' | 'F8' | 'F01' | 'F02' | 'F07';

export type EtablissementType =
  | 'EPHR'
  | 'EPHD'
  | 'CSU_DM'
  | 'CSU_D'
  | 'CSUS_PMI'
  | 'CSR_DM'
  | 'CSR_D'
  | 'INCONNU';

export interface Region {
  code: string;      // ex. "INDENIE_DUABLIN"
  libelle: string;   // ex. "INDENIE-DUABLIN"
}

export interface District {
  code: string;      // ex. "ABENGOUROU"
  codeId: string;    // ex. "D01"
  libelle: string;   // ex. "ABENGOUROU"
  regionCode: string;
}

export interface Enqueteur {
  code: string;         // ex. "D01ENQ1"
  nom: string;          // ex. "HIEN SIÉ ARISTIDE"
  libelleComplet: string;
  districtCode: string; // ex. "ABENGOUROU"
  regionCode: string;
}

export interface Superviseur {
  code: string;         // ex. "D01SUP1"
  nom: string;
  libelleComplet: string;
  districtCode: string;
  regionCode: string;
}

export interface Etablissement {
  code: string;         // nom Kobo, ex. "CSU_DM_PUBLIC_DE_APPOISSO" — clé de jointure Kobo
  codeId: string;       // ex. "E01"
  libelle: string;      // libellé humain
  type: EtablissementType;
  districtCode: string;
  regionCode: string;
  enqueteurCode: string;
}

export interface Referentiel {
  meta: {
    genereLe: string;             // ISO datetime
    sourceForms: string[];        // fichiers XLSForm utilisés
  };
  regions: Region[];
  districts: District[];
  enqueteurs: Enqueteur[];
  superviseurs: Superviseur[];
  etablissements: Etablissement[];
}

/**
 * Cible F6 selon le type d'établissement (voir spec section 3.4).
 * — CSR_D : infirmier uniquement                → 1
 * — CSR_DM: infirmier + sage-femme/maïeuticien → 2
 * — CSU_D / CSU_DM / CSUS_PMI                  → 3 (médecin + inf. + SF/maïe.)
 * — EPHR / EPHD                                → 3 (gynéco + inf. + SF/maïe.)
 * — INCONNU: plancher de sécurité              → 1 (à signaler en anomalie)
 */
export function cibleF6ParType(type: EtablissementType): number {
  switch (type) {
    case 'CSR_D':
      return 1;
    case 'CSR_DM':
      return 2;
    case 'CSU_D':
    case 'CSU_DM':
    case 'CSUS_PMI':
    case 'EPHR':
    case 'EPHD':
      return 3;
    case 'INCONNU':
    default:
      return 1;
  }
}

/**
 * Professions attendues F6 selon le type d'établissement.
 * Valeurs de `Profession__X` dans le formulaire 6.
 */
export function professionsAttenduesF6(type: EtablissementType): string[] {
  switch (type) {
    case 'CSR_D':
      return ['infirmier'];
    case 'CSR_DM':
      return ['infirmier', 'sage_femme_ou_maieuticien'];
    case 'CSU_D':
    case 'CSU_DM':
    case 'CSUS_PMI':
    case 'EPHR':
    case 'EPHD':
      return ['medecin', 'infirmier', 'sage_femme_ou_maieuticien'];
    case 'INCONNU':
    default:
      return ['infirmier'];
  }
}
