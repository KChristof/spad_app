/**
 * Configuration des 7 formulaires suivis par le dashboard.
 * L'`assetUid` est lu à l'exécution depuis les variables d'environnement
 * afin qu'un formulaire non encore déployé (F5/F6 avant mercredi soir)
 * puisse basculer en suivi actif sans redéploiement du code — il suffit
 * d'ajouter la valeur dans Vercel Project Settings puis de redéployer.
 */
import type { FormulaireId } from '@/lib/referentiel/types';

export type FormulaireCategorie = 'enqueteur' | 'superviseur';

export interface FormulaireConfig {
  id: FormulaireId;
  libelle: string;
  libelleCourt: string;
  idString: string;
  categorie: FormulaireCategorie;
  envVarAssetUid: string;
  /** Cible fixe par établissement (null si variable ou non applicable). */
  cibleParEtablissement: number | null;
  /** Cible fixe par district (F01 uniquement). */
  cibleParDistrict: number | null;
  /** F07 n'a pas de cible fixe — indicateur de cohérence uniquement. */
  aCibleFixe: boolean;
}

/**
 * Libellé affiché partout dans l'UI — la clé interne (F5..F07) reste courte
 * pour le code, mais l'utilisateur ne voit jamais "F7" à côté de "F07" (trop
 * ambigus visuellement). Voir /docs section « nommage ».
 */
export const FORMULAIRES: readonly FormulaireConfig[] = [
  {
    id: 'F5',
    libelle: 'Tabac — Femmes enceintes/allaitantes',
    libelleCourt: 'Tabac — Femmes',
    idString: '5_PNLTA_SPAD_Fiche_Femmes_Enceintes_Allaitantes',
    categorie: 'enqueteur',
    envVarAssetUid: 'KOBO_ASSET_UID_F5',
    cibleParEtablissement: 15,
    cibleParDistrict: null,
    aCibleFixe: true,
  },
  {
    id: 'F6',
    libelle: 'Tabac — Personnel de santé (CAP)',
    libelleCourt: 'Tabac — Personnel',
    idString: '6_PNLTA_SPAD_Fiche_CAP_Personnel_de_Sante',
    categorie: 'enqueteur',
    envVarAssetUid: 'KOBO_ASSET_UID_F6',
    cibleParEtablissement: null, // variable selon type
    cibleParDistrict: null,
    aCibleFixe: true,
  },
  {
    id: 'F7',
    libelle: 'Vaccination — Ménages',
    libelleCourt: 'Vacc. — Ménages',
    idString: '7_PEV_SPAD_Fiche_Menage_Non_Vaccination',
    categorie: 'enqueteur',
    envVarAssetUid: 'KOBO_ASSET_UID_F7',
    cibleParEtablissement: 15,
    cibleParDistrict: null,
    aCibleFixe: true,
  },
  {
    id: 'F8',
    libelle: 'Vaccination — Établissement',
    libelleCourt: 'Vacc. — Étab.',
    idString: '8_PEV_SPAD_Fiche_Etablissement_Non_Vaccination',
    categorie: 'enqueteur',
    envVarAssetUid: 'KOBO_ASSET_UID_F8',
    cibleParEtablissement: 1,
    cibleParDistrict: null,
    aCibleFixe: true,
  },
  {
    id: 'F01',
    libelle: 'RDM — Fiche district',
    libelleCourt: 'RDM — District',
    idString: 'rdm_f01',
    categorie: 'superviseur',
    envVarAssetUid: 'KOBO_ASSET_UID_F01',
    cibleParEtablissement: null,
    cibleParDistrict: 1,
    aCibleFixe: true,
  },
  {
    id: 'F02',
    libelle: 'RDM — Fiche établissement',
    libelleCourt: 'RDM — Étab.',
    idString: 'rdm_f02',
    categorie: 'superviseur',
    envVarAssetUid: 'KOBO_ASSET_UID_F02',
    cibleParEtablissement: 1,
    cibleParDistrict: null,
    aCibleFixe: true,
  },
  {
    id: 'F07',
    libelle: 'RDM — Grille de revue',
    libelleCourt: 'RDM — Grille',
    idString: 'rdm_f07',
    categorie: 'superviseur',
    envVarAssetUid: 'KOBO_ASSET_UID_F07',
    cibleParEtablissement: null,
    cibleParDistrict: null,
    aCibleFixe: false, // seuil plancher = somme des décès notifiés (rdm-cibles.json)
  },
];

/** Légende de l'acronyme RDM, à afficher une fois en bas de la vue nationale. */
export const LEGENDE_ACRONYMES: Array<{ acr: string; libelle: string }> = [
  { acr: 'RDM', libelle: 'Revue des Décès Maternels' },
  { acr: 'CAP', libelle: 'Connaissances, Attitudes, Pratiques' },
  { acr: 'DIS', libelle: 'Direction de l’Information Sanitaire' },
  { acr: 'UGP', libelle: 'Unité de Gestion du Processus de Production des Données Normalisées' },
];

export function getFormulaireConfig(id: FormulaireId): FormulaireConfig {
  const f = FORMULAIRES.find((x) => x.id === id);
  if (!f) throw new Error(`Formulaire inconnu: ${id}`);
  return f;
}

/** Retourne l'`asset_uid` Kobo si la variable d'env est définie, sinon null. */
export function getAssetUid(id: FormulaireId): string | null {
  const cfg = getFormulaireConfig(id);
  const v = process.env[cfg.envVarAssetUid];
  return v && v.trim() !== '' ? v.trim() : null;
}

export function isDeploye(id: FormulaireId): boolean {
  return getAssetUid(id) !== null;
}
