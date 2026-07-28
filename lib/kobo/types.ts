/**
 * Types minimaux des soumissions Kobo utilisés par le dashboard.
 * On ne modélise que les champs consommés par le calcul de complétude —
 * les soumissions Kobo sont beaucoup plus larges mais on n'a pas besoin
 * du reste.
 */

/** Champs communs aux formulaires 1-4 (bloc ENTETE_STANDARD). */
export interface EnteteStandard {
  Date_Collecte__A?: string;
  Region_Sanitaire__X?: string;
  District_Sanitaire__X?: string;
  Profil_Collecteur__X?: 'enqueteur' | 'superviseur';
  Code_Superviseur__E?: string;
  Code_Enqueteur__E?: string;
  Etablissement_Sanitaire__X?: string;
  Identifiant_Etablissement__Z?: string;
}

export interface SoumissionKobo extends EnteteStandard {
  _id: number | string;
  _uuid: string;
  _submission_time?: string;
  _validation_status?: unknown;

  // Champs spécifiques utiles au comptage
  Numero_Ordre_Prestataire__1?: string | number; // F6
  Profession__X?: string;                         // F6
  Numero_Ordre_Menage__1?: string | number;       // F7
  Code_Participante__E?: string;                  // F5 (identifiant libre, non fiable pour dédup)

  // F01 / F02 / F07 — champs propres
  F01_superviseur__Z?: string;
  F01_enqueteur__Z?: string;
  F01_05__1?: string | number; // nombre de décès avec fiche notif disponible
  F02_00b_superviseur__Z?: string;
  F02_00c_enqueteur__Z?: string;
  F02_ID_ORDRE__1?: string | number;
  F02_01__E?: string;          // établissement (nom Kobo)
  F02_09__1?: string | number; // nombre de décès maternels revus (F02)

  [key: string]: unknown;
}
