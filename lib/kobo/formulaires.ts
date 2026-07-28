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

export const FORMULAIRES: readonly FormulaireConfig[] = [
  {
    id: 'F5',
    libelle: 'Fiche femmes enceintes/allaitantes — tabac',
    libelleCourt: 'F5 (Tabac femmes)',
    idString: '5_PNLTA_SPAD_Fiche_Femmes_Enceintes_Allaitantes',
    categorie: 'enqueteur',
    envVarAssetUid: 'KOBO_ASSET_UID_F5',
    cibleParEtablissement: 15,
    cibleParDistrict: null,
    aCibleFixe: true,
  },
  {
    id: 'F6',
    libelle: 'Fiche CAP personnel de santé — tabac',
    libelleCourt: 'F6 (Tabac personnel)',
    idString: '6_PNLTA_SPAD_Fiche_CAP_Personnel_de_Sante',
    categorie: 'enqueteur',
    envVarAssetUid: 'KOBO_ASSET_UID_F6',
    cibleParEtablissement: null, // variable selon type
    cibleParDistrict: null,
    aCibleFixe: true,
  },
  {
    id: 'F7',
    libelle: 'Fiche ménage — non-vaccination',
    libelleCourt: 'F7 (Ménages)',
    idString: '7_PEV_SPAD_Fiche_Menage_Non_Vaccination',
    categorie: 'enqueteur',
    envVarAssetUid: 'KOBO_ASSET_UID_F7',
    cibleParEtablissement: 15,
    cibleParDistrict: null,
    aCibleFixe: true,
  },
  {
    id: 'F8',
    libelle: 'Fiche établissement — non-vaccination',
    libelleCourt: 'F8 (Étab. PEV)',
    idString: '8_PEV_SPAD_Fiche_Etablissement_Non_Vaccination',
    categorie: 'enqueteur',
    envVarAssetUid: 'KOBO_ASSET_UID_F8',
    cibleParEtablissement: 1,
    cibleParDistrict: null,
    aCibleFixe: true,
  },
  {
    id: 'F01',
    libelle: 'Fiche district — revue des décès maternels',
    libelleCourt: 'F01 (District RDM)',
    idString: 'rdm_f01',
    categorie: 'superviseur',
    envVarAssetUid: 'KOBO_ASSET_UID_F01',
    cibleParEtablissement: null,
    cibleParDistrict: 1,
    aCibleFixe: true,
  },
  {
    id: 'F02',
    libelle: 'Fiche établissement — revue des décès maternels',
    libelleCourt: 'F02 (Étab. RDM)',
    idString: 'rdm_f02',
    categorie: 'superviseur',
    envVarAssetUid: 'KOBO_ASSET_UID_F02',
    cibleParEtablissement: 1,
    cibleParDistrict: null,
    aCibleFixe: true,
  },
  {
    id: 'F07',
    libelle: 'Grille intégrée de revue des décès maternels',
    libelleCourt: 'F07 (Grille RDM)',
    idString: 'rdm_f07',
    categorie: 'superviseur',
    envVarAssetUid: 'KOBO_ASSET_UID_F07',
    cibleParEtablissement: null,
    cibleParDistrict: null,
    aCibleFixe: false, // dépend du nombre de décès réellement revus
  },
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
