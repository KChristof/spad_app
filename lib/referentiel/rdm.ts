import 'server-only';
import rdmData from '@/data/rdm-cibles.json';

/**
 * Cibles RDM (F02 / F07) — voir data/rdm-cibles.json et spec Affinement §2.
 *
 * F02 : ne concerne QUE les établissements listés dans `etablissements_a_auditer`
 * (ceux ayant notifié ≥1 décès maternel au SIG). Les autres passent en
 * statut « Non concerné » (badge neutre, exclus du dénominateur).
 *
 * F07 : cible par district = `somme_deces_f07_minimum` — plancher (pas plafond).
 */

interface EtablissementAAuditer {
  district_code: string;
  code_id: string;
  etablissement_label: string;
  deces_notifies_sig: number;
  source: string;
}

interface CibleDistrict {
  district_code: string;
  nb_etab_f02_attendu: number;
  somme_deces_f07_minimum: number;
}

interface RdmData {
  note: string;
  etablissements_a_auditer: EtablissementAAuditer[];
  cibles_par_district: CibleDistrict[];
}

const RDM = rdmData as RdmData;

// Index par (district_code + code_id) pour lookup O(1)
const auditerIndex = new Map<string, EtablissementAAuditer>();
for (const e of RDM.etablissements_a_auditer) {
  auditerIndex.set(`${e.district_code}|${e.code_id}`, e);
}

const cibleIndex = new Map<string, CibleDistrict>();
for (const c of RDM.cibles_par_district) {
  cibleIndex.set(c.district_code, c);
}

/**
 * L'établissement fait-il partie de l'audit F02 (a-t-il notifié un décès) ?
 * Renvoie undefined si non concerné.
 */
export function etabAuditeF02(districtCode: string, codeId: string): EtablissementAAuditer | undefined {
  return auditerIndex.get(`${districtCode}|${codeId}`);
}

/** Nombre d'établissements F02 attendus dans le district (cible F02 district). */
export function cibleF02District(districtCode: string): number {
  return cibleIndex.get(districtCode)?.nb_etab_f02_attendu ?? 0;
}

/** Seuil plancher F07 pour le district (somme des décès notifiés dans les étab. audités). */
export function cibleF07MinimumDistrict(districtCode: string): number {
  return cibleIndex.get(districtCode)?.somme_deces_f07_minimum ?? 0;
}

/** Renvoie les codes district audités pour F02 (utile pour les grilles). */
export function districtsAvecAuditF02(): Set<string> {
  return new Set(RDM.etablissements_a_auditer.map((e) => e.district_code));
}

/** Détail brut pour affichage / tooltip. */
export function detailAuditDistrict(districtCode: string): EtablissementAAuditer[] {
  return RDM.etablissements_a_auditer.filter((e) => e.district_code === districtCode);
}
