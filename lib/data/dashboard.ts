import 'server-only';

/**
 * Couche d'agrégation appelée par les pages du dashboard ET par le cron
 * de snapshot quotidien. Renvoie une structure prête à consommer côté UI —
 * l'idée est que chaque page appelle 1 seul de ces builders, jamais Kobo
 * en direct.
 */

import { fetchTousLesFormulaires, type FormulaireDonnees } from '@/lib/kobo/client';
import { FORMULAIRES, getFormulaireConfig } from '@/lib/kobo/formulaires';
import {
  getEtablissements,
  getDistricts,
  getEtablissementsDuDistrict,
} from '@/lib/referentiel/data';
import type { FormulaireId, Etablissement } from '@/lib/referentiel/types';
import {
  completudeParEtablissement,
  completudeF01ParDistrict,
  coherenceF07,
  anomaliesProfilCollecteur,
} from '@/lib/completude';
import { agregerParCle, type AgregatCompletude } from '@/lib/completude/agregations';
import type { CompletudeEtablissement } from '@/lib/completude/types';

export interface DashboardState {
  genereLe: string; // ISO
  formulaires: {
    id: FormulaireId;
    deploye: boolean;
    erreur: string | null;
    nbSoumissions: number;
  }[];
  /** Complétude par (établissement, formulaire) — F5/F6/F7/F8/F02 uniquement. */
  parEtablissement: CompletudeEtablissement[];
  /** Complétude F01 par district. */
  f01ParDistrict: CompletudeEtablissement[];
  /** Cohérence F07 par district. */
  f07Coherence: ReturnType<typeof coherenceF07>[];
  /** Agrégats district × formulaire (F5/F6/F7/F8/F02). */
  agregatsDistrict: AgregatCompletude[];
  /** Agrégats région × formulaire (F5/F6/F7/F8/F02). */
  agregatsRegion: AgregatCompletude[];
  /** Agrégats nationaux par formulaire (les 7). */
  agregatsNational: AgregatCompletude[];
  /** Anomalies globales. */
  anomalies: {
    profilCollecteurSuperviseurSurFormEnqueteur: number;
    etablissementsTypeInconnu: string[];
  };
}

const FORMULAIRES_ETAB: Exclude<FormulaireId, 'F01' | 'F07'>[] = ['F5', 'F6', 'F7', 'F8', 'F02'];

export async function buildDashboardState(): Promise<DashboardState> {
  const donnees = await fetchTousLesFormulaires();
  return computeDashboardState(donnees);
}

export function computeDashboardState(donnees: FormulaireDonnees[]): DashboardState {
  const byId = new Map<FormulaireId, FormulaireDonnees>();
  for (const d of donnees) byId.set(d.id, d);

  const etablissements = getEtablissements();
  const districts = getDistricts();

  // 1. Complétude par (établissement, formulaire) pour F5/F6/F7/F8/F02
  const parEtablissement: CompletudeEtablissement[] = [];
  for (const fid of FORMULAIRES_ETAB) {
    const soum = byId.get(fid)?.soumissions ?? [];
    for (const e of etablissements) {
      parEtablissement.push(completudeParEtablissement(fid, e, soum));
    }
  }

  // 2. F01 par district
  const f01Soum = byId.get('F01')?.soumissions ?? [];
  const f01ParDistrict = districts.map((d) => completudeF01ParDistrict(d.code, f01Soum));

  // 3. F07 cohérence par district
  const f07Soum = byId.get('F07')?.soumissions ?? [];
  const f02Soum = byId.get('F02')?.soumissions ?? [];
  const f07Coherence = districts.map((d) =>
    coherenceF07(d.code, f07Soum, f01Soum, f02Soum),
  );

  // 4. Agrégats district × formulaire (pour F5/F6/F7/F8/F02)
  const agregatsDistrict: AgregatCompletude[] = [];
  for (const fid of FORMULAIRES_ETAB) {
    const parFid = parEtablissement.filter((c) => c.formulaireId === fid);
    for (const d of districts) {
      const etabsCodes = new Set(getEtablissementsDuDistrict(d.code).map((e) => e.code));
      const sous = parFid.filter((c) => etabsCodes.has(c.etablissementCode));
      agregatsDistrict.push(agregerParCle(fid, sous, d.code));
    }
  }
  // Ajouter F01 (agrégat = complétude district directement)
  for (const c of f01ParDistrict) {
    agregatsDistrict.push({
      formulaireId: 'F01',
      cle: c.etablissementCode,
      nbAttendu: c.nbAttendu ?? 0,
      nbRecu: c.nbRecu,
      nbRecuPlafond: Math.min(c.nbRecu, c.nbAttendu ?? c.nbRecu),
      taux: c.taux,
      statut: c.statut,
      nbEtablissements: 1,
    });
  }

  // 5. Agrégats région × formulaire (somme des districts de la région)
  const agregatsRegion: AgregatCompletude[] = [];
  const regionsUniques = new Set(districts.map((d) => d.regionCode));
  for (const rc of regionsUniques) {
    const districtsRegion = new Set(
      districts.filter((d) => d.regionCode === rc).map((d) => d.code),
    );
    for (const fid of [...FORMULAIRES_ETAB, 'F01'] as FormulaireId[]) {
      const sousAgregats = agregatsDistrict.filter(
        (a) => a.formulaireId === fid && districtsRegion.has(a.cle),
      );
      const nbAttendu = sousAgregats.reduce((s, a) => s + a.nbAttendu, 0);
      const nbRecuPlafond = sousAgregats.reduce((s, a) => s + a.nbRecuPlafond, 0);
      const nbRecu = sousAgregats.reduce((s, a) => s + a.nbRecu, 0);
      const taux = nbAttendu > 0 ? nbRecuPlafond / nbAttendu : null;
      agregatsRegion.push({
        formulaireId: fid,
        cle: rc,
        nbAttendu,
        nbRecu,
        nbRecuPlafond,
        taux,
        statut: taux === null ? 'neutre' : taux === 0 ? 'zero' : taux < 1 ? 'partiel' : taux === 1 ? 'plein' : 'exces',
        nbEtablissements: sousAgregats.reduce((s, a) => s + a.nbEtablissements, 0),
      });
    }
  }

  // 6. Agrégats nationaux
  const agregatsNational: AgregatCompletude[] = [];
  for (const fid of [...FORMULAIRES_ETAB, 'F01'] as FormulaireId[]) {
    const sousAgregats = agregatsDistrict.filter((a) => a.formulaireId === fid);
    const nbAttendu = sousAgregats.reduce((s, a) => s + a.nbAttendu, 0);
    const nbRecuPlafond = sousAgregats.reduce((s, a) => s + a.nbRecuPlafond, 0);
    const nbRecu = sousAgregats.reduce((s, a) => s + a.nbRecu, 0);
    const taux = nbAttendu > 0 ? nbRecuPlafond / nbAttendu : null;
    agregatsNational.push({
      formulaireId: fid,
      cle: 'NATIONAL',
      nbAttendu,
      nbRecu,
      nbRecuPlafond,
      taux,
      statut: taux === null ? 'neutre' : taux === 0 ? 'zero' : taux < 1 ? 'partiel' : taux === 1 ? 'plein' : 'exces',
      nbEtablissements: sousAgregats.reduce((s, a) => s + a.nbEtablissements, 0),
    });
  }
  // F07: pas d'agrégat classique, on renseigne nbRecu total, nbAttendu null
  const nbF07 = f07Soum.length;
  agregatsNational.push({
    formulaireId: 'F07',
    cle: 'NATIONAL',
    nbAttendu: 0,
    nbRecu: nbF07,
    nbRecuPlafond: nbF07,
    taux: null,
    statut: 'neutre',
    nbEtablissements: districts.length,
  });

  // 7. Anomalies globales
  const anomProfil =
    (['F5', 'F6', 'F7', 'F8'] as FormulaireId[])
      .reduce((s, fid) => s + anomaliesProfilCollecteur(byId.get(fid)?.soumissions ?? [], fid), 0);
  const etabsInconnus = etablissements.filter((e) => e.type === 'INCONNU').map((e) => e.code);

  return {
    genereLe: new Date().toISOString(),
    formulaires: donnees.map((d) => ({
      id: d.id,
      deploye: d.deploye,
      erreur: d.erreur,
      nbSoumissions: d.soumissions.length,
    })),
    parEtablissement,
    f01ParDistrict,
    f07Coherence,
    agregatsDistrict,
    agregatsRegion,
    agregatsNational,
    anomalies: {
      profilCollecteurSuperviseurSurFormEnqueteur: anomProfil,
      etablissementsTypeInconnu: etabsInconnus,
    },
  };
}

/** Utilitaire d'affichage: retrouve la complétude d'un couple (etab, fid). */
export function findCompletude(
  state: DashboardState,
  etabCode: string,
  fid: FormulaireId,
): CompletudeEtablissement | undefined {
  return state.parEtablissement.find(
    (c) => c.etablissementCode === etabCode && c.formulaireId === fid,
  );
}
