/**
 * Fonctions pures de calcul de complétude — voir spec section 3.
 * Aucun accès I/O, entièrement testable en isolation.
 */

import type { SoumissionKobo } from '@/lib/kobo/types';
import type {
  Etablissement,
  EtablissementType,
  FormulaireId,
} from '@/lib/referentiel/types';
import { cibleF6ParType, professionsAttenduesF6 } from '@/lib/referentiel/types';
import type {
  CompletudeEtablissement,
  CompletudeF6Detail,
} from './types';
import { determinerStatut, determinerStatutF07 } from './statut';
import { getField, getFieldString } from '@/lib/kobo/fields';

/** Trouve le code établissement dans une soumission — ordre de préférence.
 *  Les champs Kobo sont préfixés par leur chemin de groupe (voir lib/kobo/fields.ts). */
export function codeEtablissementDeSoumission(s: SoumissionKobo): string | null {
  const direct = getFieldString(s as Record<string, unknown>, 'Etablissement_Sanitaire__X');
  if (direct) return direct;
  const f02 = getFieldString(s as Record<string, unknown>, 'F02_01__E');
  if (f02) return f02;
  return null;
}

/** Trouve le code district dans une soumission. */
export function codeDistrictDeSoumission(s: SoumissionKobo): string | null {
  return getFieldString(s as Record<string, unknown>, 'District_Sanitaire__X') ?? null;
}

// ---------------------------------------------------------------------------
// F5 — 15 fiches par établissement
// ---------------------------------------------------------------------------

export function completudeF5(
  etab: Etablissement,
  soumissions: SoumissionKobo[],
): CompletudeEtablissement {
  const CIBLE = 15;
  const s = soumissions.filter(
    (x) => codeEtablissementDeSoumission(x) === etab.code,
  );
  // Dédoublonnage sur _uuid (spec: Code_Participante__E non fiable)
  const uniques = new Map<string, SoumissionKobo>();
  for (const r of s) uniques.set(String(r._uuid), r);
  const nbRecu = uniques.size;

  const anomalies: string[] = [];
  if (nbRecu > CIBLE) anomalies.push(`Nombre de soumissions (${nbRecu}) supérieur à la cible (${CIBLE}).`);

  const taux = nbRecu / CIBLE;
  return {
    etablissementCode: etab.code,
    formulaireId: 'F5',
    nbAttendu: CIBLE,
    nbRecu,
    taux,
    statut: determinerStatut(taux),
    anomalies,
  };
}

// ---------------------------------------------------------------------------
// F6 — cible variable selon le type d'établissement (spec section 3.4)
// ---------------------------------------------------------------------------

const NORMALISATION_PROFESSION: Record<string, string> = {
  medecin: 'medecin',
  médecin: 'medecin',
  gynecologue: 'medecin',
  gynécologue: 'medecin',
  infirmier: 'infirmier',
  infirmière: 'infirmier',
  infirmiere: 'infirmier',
  sage_femme: 'sage_femme_ou_maieuticien',
  'sage-femme': 'sage_femme_ou_maieuticien',
  sage_femme_ou_maieuticien: 'sage_femme_ou_maieuticien',
  maieuticien: 'sage_femme_ou_maieuticien',
  maïeuticien: 'sage_femme_ou_maieuticien',
};

function normaliserProfession(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const raw = String(v).trim().toLowerCase();
  if (!raw) return null;
  return NORMALISATION_PROFESSION[raw] ?? raw;
}

export function completudeF6(
  etab: Etablissement,
  soumissions: SoumissionKobo[],
): CompletudeEtablissement {
  const CIBLE = cibleF6ParType(etab.type);
  const attendus = professionsAttenduesF6(etab.type);

  const s = soumissions.filter(
    (x) => codeEtablissementDeSoumission(x) === etab.code,
  );

  const professionsCount = new Map<string, number>();
  for (const r of s) {
    const p = normaliserProfession(getField(r as Record<string, unknown>, 'Profession__X'));
    if (!p) continue;
    professionsCount.set(p, (professionsCount.get(p) ?? 0) + 1);
  }

  const obtenus = Array.from(professionsCount.keys()).filter((p) => attendus.includes(p));
  const manquants = attendus.filter((p) => !obtenus.includes(p));
  const doublons = Array.from(professionsCount.entries())
    .filter(([, n]) => n > 1)
    .map(([p]) => p);

  const nbRecu = obtenus.length;
  const taux = CIBLE === 0 ? null : nbRecu / CIBLE;

  const anomalies: string[] = [];
  if (etab.type === 'INCONNU') {
    anomalies.push(`Type d'établissement non reconnu — cible F6 par défaut = 1.`);
  }
  if (doublons.length > 0) {
    anomalies.push(`Doublons de profession dans F6 : ${doublons.join(', ')}.`);
  }
  if (s.length > CIBLE + 1 && CIBLE > 0) {
    anomalies.push(`Nombre de soumissions brutes (${s.length}) supérieur à la cible (${CIBLE}).`);
  }

  const detailF6: CompletudeF6Detail = {
    attendus,
    obtenus,
    manquants,
    doublons,
  };

  return {
    etablissementCode: etab.code,
    formulaireId: 'F6',
    nbAttendu: CIBLE,
    nbRecu,
    taux,
    statut: determinerStatut(taux),
    anomalies,
    detailF6,
  };
}

// ---------------------------------------------------------------------------
// F7 — 15 ménages par établissement + contrôle Numero_Ordre_Menage
// ---------------------------------------------------------------------------

export function completudeF7(
  etab: Etablissement,
  soumissions: SoumissionKobo[],
): CompletudeEtablissement {
  const CIBLE = 15;
  const s = soumissions.filter(
    (x) => codeEtablissementDeSoumission(x) === etab.code,
  );

  const uniques = new Map<string, SoumissionKobo>();
  for (const r of s) uniques.set(String(r._uuid), r);
  const nbRecu = uniques.size;

  const anomalies: string[] = [];

  // Doublons de Numero_Ordre_Menage__1
  const ordresCount = new Map<string, number>();
  for (const r of uniques.values()) {
    const o = getField(r as Record<string, unknown>, 'Numero_Ordre_Menage__1');
    if (o !== undefined && o !== null && o !== '') {
      const k = String(o);
      ordresCount.set(k, (ordresCount.get(k) ?? 0) + 1);
    }
  }
  const doublons = Array.from(ordresCount.entries()).filter(([, n]) => n > 1);
  if (doublons.length > 0) {
    anomalies.push(
      `Numéros de ménage en doublon : ${doublons.map(([k, n]) => `${k}×${n}`).join(', ')}.`,
    );
  }

  if (nbRecu > CIBLE) anomalies.push(`Nombre de soumissions (${nbRecu}) supérieur à la cible (${CIBLE}).`);

  const taux = nbRecu / CIBLE;
  return {
    etablissementCode: etab.code,
    formulaireId: 'F7',
    nbAttendu: CIBLE,
    nbRecu,
    taux,
    statut: determinerStatut(taux),
    anomalies,
  };
}

// ---------------------------------------------------------------------------
// F8 — 1 fiche par établissement
// ---------------------------------------------------------------------------

export function completudeF8(
  etab: Etablissement,
  soumissions: SoumissionKobo[],
): CompletudeEtablissement {
  const CIBLE = 1;
  const s = soumissions.filter(
    (x) => codeEtablissementDeSoumission(x) === etab.code,
  );
  const uniques = new Map<string, SoumissionKobo>();
  for (const r of s) uniques.set(String(r._uuid), r);
  const nbRecu = uniques.size;

  const anomalies: string[] = [];
  if (nbRecu > CIBLE) anomalies.push(`${nbRecu} fiches F8 pour cet établissement (attendu ${CIBLE}).`);

  const taux = nbRecu / CIBLE;
  return {
    etablissementCode: etab.code,
    formulaireId: 'F8',
    nbAttendu: CIBLE,
    nbRecu,
    taux,
    statut: determinerStatut(taux),
    anomalies,
  };
}

// ---------------------------------------------------------------------------
// F02 — SEULS les établissements ayant notifié ≥1 décès maternel au SIG
// sont concernés. Les autres passent en statut « Non concerné » (gris,
// exclus du dénominateur). Voir spec Affinement §2 + data/rdm-cibles.json.
// ---------------------------------------------------------------------------

export interface AuditeurF02Info {
  concerne: boolean;
  decesNotifies?: number; // renseigné si concerne=true
  source?: string;        // provenance de la donnée (fichier tirage ou correction manuelle)
}

export function completudeF02(
  etab: Etablissement,
  soumissions: SoumissionKobo[],
  audit?: AuditeurF02Info,
): CompletudeEtablissement {
  // Décompte des soumissions (utile même pour un établissement non concerné,
  // pour détecter un excès inattendu).
  const s = soumissions.filter(
    (x) => codeEtablissementDeSoumission(x) === etab.code,
  );
  const uniques = new Map<string, SoumissionKobo>();
  for (const r of s) uniques.set(String(r._uuid), r);
  const nbRecu = uniques.size;

  // Cas 1 — établissement hors périmètre d'audit (pas de décès notifié)
  if (!audit || !audit.concerne) {
    const anomalies: string[] = [];
    if (nbRecu > 0) {
      anomalies.push(
        `Fiche F02 reçue (${nbRecu}) alors que l’établissement n’avait pas de décès notifié — vérifier.`,
      );
    }
    return {
      etablissementCode: etab.code,
      formulaireId: 'F02',
      nbAttendu: null,
      nbRecu,
      taux: null,
      statut: 'nonConcerne',
      anomalies,
    };
  }

  // Cas 2 — établissement concerné : cible = 1
  const CIBLE = 1;
  const anomalies: string[] = [];
  if (nbRecu > CIBLE) anomalies.push(`${nbRecu} fiches F02 pour cet établissement (attendu ${CIBLE}).`);

  const taux = nbRecu / CIBLE;
  return {
    etablissementCode: etab.code,
    formulaireId: 'F02',
    nbAttendu: CIBLE,
    nbRecu,
    taux,
    statut: determinerStatut(taux),
    anomalies,
  };
}

// ---------------------------------------------------------------------------
// F01 — 1 fiche par district (niveau district, pas par établissement)
// ---------------------------------------------------------------------------

export function completudeF01ParDistrict(
  districtCode: string,
  soumissions: SoumissionKobo[],
): CompletudeEtablissement {
  const CIBLE = 1;
  const s = soumissions.filter((x) => codeDistrictDeSoumission(x) === districtCode);
  const uniques = new Map<string, SoumissionKobo>();
  for (const r of s) uniques.set(String(r._uuid), r);
  const nbRecu = uniques.size;

  const anomalies: string[] = [];
  if (nbRecu > CIBLE) anomalies.push(`${nbRecu} fiches F01 pour ce district (attendu 1).`);

  const taux = nbRecu / CIBLE;
  return {
    etablissementCode: districtCode, // on réutilise le champ pour l'affichage
    formulaireId: 'F01',
    nbAttendu: CIBLE,
    nbRecu,
    taux,
    statut: determinerStatut(taux),
    anomalies,
  };
}

// ---------------------------------------------------------------------------
// F07 — cible plancher = somme des décès notifiés au SIG dans le district.
// Voir spec Affinement §2 + data/rdm-cibles.json.
// Rouge si 0 reçu, orange si 0 < reçu < cible, vert si reçu >= cible.
// Dépasser la cible est NORMAL (contrairement aux autres formulaires).
// ---------------------------------------------------------------------------

export interface CompletudeF07District {
  districtCode: string;
  nbRecu: number;             // nombre de fiches F07 reçues pour le district
  cibleMinimum: number;       // somme_deces_f07_minimum
  statut: 'zero' | 'partiel' | 'plein' | 'neutre';
  // Champs de cohérence conservés à titre indicatif (déclaratifs de F01/F02)
  nbDecesRevusDeclaresF01: number;
  nbDecesRevusDeclaresF02: number;
}

export function completudeF07District(
  districtCode: string,
  cibleMinimum: number,
  soumissionsF07: SoumissionKobo[],
  soumissionsF01: SoumissionKobo[],
  soumissionsF02: SoumissionKobo[],
): CompletudeF07District {
  const nbRecu = soumissionsF07.filter(
    (x) => codeDistrictDeSoumission(x) === districtCode,
  ).length;

  const nbDecesRevusDeclaresF01 = soumissionsF01
    .filter((x) => codeDistrictDeSoumission(x) === districtCode)
    .reduce((acc, x) => acc + toInt(getField(x as Record<string, unknown>, 'F01_05__1')), 0);

  const nbDecesRevusDeclaresF02 = soumissionsF02
    .filter((x) => codeDistrictDeSoumission(x) === districtCode)
    .reduce((acc, x) => acc + toInt(getField(x as Record<string, unknown>, 'F02_09__1')), 0);

  return {
    districtCode,
    nbRecu,
    cibleMinimum,
    statut: determinerStatutF07(nbRecu, cibleMinimum) as CompletudeF07District['statut'],
    nbDecesRevusDeclaresF01,
    nbDecesRevusDeclaresF02,
  };
}

function toInt(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Fonction de dispatch générique (F5/F6/F7/F8/F02 par établissement)
// ---------------------------------------------------------------------------

export function completudeParEtablissement(
  formulaireId: Exclude<FormulaireId, 'F01' | 'F07'>,
  etab: Etablissement,
  soumissions: SoumissionKobo[],
  auditF02?: AuditeurF02Info, // requis (ou null) pour F02, ignoré ailleurs
): CompletudeEtablissement {
  switch (formulaireId) {
    case 'F5':
      return completudeF5(etab, soumissions);
    case 'F6':
      return completudeF6(etab, soumissions);
    case 'F7':
      return completudeF7(etab, soumissions);
    case 'F8':
      return completudeF8(etab, soumissions);
    case 'F02':
      return completudeF02(etab, soumissions, auditF02);
  }
}

// ---------------------------------------------------------------------------
// Détection anomalie: profil superviseur sur un formulaire enquêteur
// ---------------------------------------------------------------------------

export function anomaliesProfilCollecteur(
  soumissions: SoumissionKobo[],
  formulaireId: FormulaireId,
): number {
  if (!['F5', 'F6', 'F7', 'F8'].includes(formulaireId)) return 0;
  return soumissions.filter(
    (x) => getFieldString(x as Record<string, unknown>, 'Profil_Collecteur__X') === 'superviseur',
  ).length;
}
