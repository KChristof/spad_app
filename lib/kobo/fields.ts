/**
 * Kobo enveloppe les champs XLSForm dans les `begin_group` / `end_group` de
 * leur onglet `survey`. L'API v2 retourne donc les valeurs sous la forme
 * `"CHEMIN/DE/GROUPE/NomDuChamp"`, avec un niveau d'imbrication qui varie
 * selon le formulaire (ex. F5/F7/F8 : `ENTETE_STANDARD/Etablissement_Sanitaire__X`,
 * F6 : `METIER_ETUDE/Section_1/Profession__X`).
 *
 * `getField()` retourne la valeur d'un champ quel que soit son préfixe :
 * match d'abord exact (au cas où Kobo aurait aplati), sinon on cherche la
 * première clé qui se termine par `/<fieldName>`.
 */

export function getField(
  submission: Record<string, unknown>,
  fieldName: string,
): unknown {
  if (fieldName in submission) return submission[fieldName];
  const suffix = '/' + fieldName;
  for (const k of Object.keys(submission)) {
    if (k.endsWith(suffix)) return submission[k];
  }
  return undefined;
}

/** Utilitaire — récupère une chaîne (ou undefined) sans risque de « [object Object] ». */
export function getFieldString(
  submission: Record<string, unknown>,
  fieldName: string,
): string | undefined {
  const v = getField(submission, fieldName);
  if (v === null || v === undefined || v === '') return undefined;
  return typeof v === 'string' ? v : String(v);
}
