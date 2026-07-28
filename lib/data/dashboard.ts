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
import {
  etabAuditeF02,
  cibleF07MinimumDistrict,
} from '@/lib/referentiel/rdm';
import type { FormulaireId } from '@/lib/referentiel/types';
import {
  completudeParEtablissement,
  completudeF01ParDistrict,
  completudeF07District,
  anomaliesProfilCollecteur,
  type CompletudeF07District,
  type AuditeurF02Info,
} from '@/lib/completude';
import { agregerParCle, type AgregatCompletude } from '@/lib/completude/agregations';
import type { CompletudeEtablissement, StatutCompletude } from '@/lib/completude/types';

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
  /** Complétude F07 par district (cible plancher — voir spec Affinement §2). */
  f07ParDistrict: CompletudeF07District[];
  /** Agrégats district × formulaire (F5/F6/F7/F8/F02 + F01 + F07). */
  agregatsDistrict: AgregatCompletude[];
  /** Agrégats région × formulaire. */
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

function statutFromTaux(taux: number | null): StatutCompletude {
  if (taux === null) return 'neutre';
  if (taux === 0) return 'zero';
  if (taux < 1) return 'partiel';
  if (taux === 1) return 'plein';
  return 'exces';
}

export function computeDashboardState(donnees: FormulaireDonnees[]): DashboardState {
  const byId = new Map<FormulaireId, FormulaireDonnees>();
  for (const d of donnees) byId.set(d.id, d);

  const etablissements = getEtablissements();
  const districts = getDistricts();

  // 1. Complétude par (établissement, formulaire) pour F5/F6/F7/F8/F02
  //    — F02 reçoit un `auditF02` : seuls les étab. ayant notifié un décès
  //      sont concernés, les autres passent en « Non concerné ».
  const parEtablissement: CompletudeEtablissement[] = [];
  for (const fid of FORMULAIRES_ETAB) {
    const soum = byId.get(fid)?.soumissions ?? [];
    for (const e of etablissements) {
      let audit: AuditeurF02Info | undefined;
      if (fid === 'F02') {
        const info = etabAuditeF02(e.districtCode, e.codeId);
        audit = info
          ? { concerne: true, decesNotifies: info.deces_notifies_sig, source: info.source }
          : { concerne: false };
      }
      parEtablissement.push(completudeParEtablissement(fid, e, soum, audit));
    }
  }

  // 2. F01 par district
  const f01Soum = byId.get('F01')?.soumissions ?? [];
  const f01ParDistrict = districts.map((d) => completudeF01ParDistrict(d.code, f01Soum));

  // 3. F07 complétude plancher par district
  const f07Soum = byId.get('F07')?.soumissions ?? [];
  const f02Soum = byId.get('F02')?.soumissions ?? [];
  const f07ParDistrict = districts.map((d) =>
    completudeF07District(d.code, cibleF07MinimumDistrict(d.code), f07Soum, f01Soum, f02Soum),
  );

  // 4. Agrégats district × formulaire (pour F5/F6/F7/F8/F02)
  //    Les entrées « Non concerné » (F02 hors périmètre) ont nbAttendu=null →
  //    naturellement exclues du dénominateur par agregerParCle.
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
  // Ajouter F07 (cible plancher — le taux peut dépasser 100 %, on l'affiche
  //   quand même sans passer en statut « excès »)
  for (const c of f07ParDistrict) {
    const taux = c.cibleMinimum > 0 ? c.nbRecu / c.cibleMinimum : null;
    agregatsDistrict.push({
      formulaireId: 'F07',
      cle: c.districtCode,
      nbAttendu: c.cibleMinimum,
      nbRecu: c.nbRecu,
      nbRecuPlafond: c.nbRecu, // pas de plafond pour F07
      taux,
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
    for (const fid of [...FORMULAIRES_ETAB, 'F01', 'F07'] as FormulaireId[]) {
      const sousAgregats = agregatsDistrict.filter(
        (a) => a.formulaireId === fid && districtsRegion.has(a.cle),
      );
      const nbAttendu = sousAgregats.reduce((s, a) => s + a.nbAttendu, 0);
      const nbRecuPlafond = sousAgregats.reduce((s, a) => s + a.nbRecuPlafond, 0);
      const nbRecu = sousAgregats.reduce((s, a) => s + a.nbRecu, 0);
      const taux = nbAttendu > 0 ? nbRecuPlafond / nbAttendu : null;
      // F07 : statut basé sur reçu vs cible plancher, jamais « excès »
      const statut: StatutCompletude =
        fid === 'F07'
          ? nbAttendu === 0
            ? 'neutre'
            : nbRecu === 0
              ? 'zero'
              : nbRecu < nbAttendu
                ? 'partiel'
                : 'plein'
          : statutFromTaux(taux);
      agregatsRegion.push({
        formulaireId: fid,
        cle: rc,
        nbAttendu,
        nbRecu,
        nbRecuPlafond,
        taux,
        statut,
        nbEtablissements: sousAgregats.reduce((s, a) => s + a.nbEtablissements, 0),
      });
    }
  }

  // 6. Agrégats nationaux
  const agregatsNational: AgregatCompletude[] = [];
  for (const fid of [...FORMULAIRES_ETAB, 'F01', 'F07'] as FormulaireId[]) {
    const sousAgregats = agregatsDistrict.filter((a) => a.formulaireId === fid);
    const nbAttendu = sousAgregats.reduce((s, a) => s + a.nbAttendu, 0);
    const nbRecuPlafond = sousAgregats.reduce((s, a) => s + a.nbRecuPlafond, 0);
    const nbRecu = sousAgregats.reduce((s, a) => s + a.nbRecu, 0);
    const taux = nbAttendu > 0 ? nbRecuPlafond / nbAttendu : null;
    const statut: StatutCompletude =
      fid === 'F07'
        ? nbAttendu === 0
          ? 'neutre'
          : nbRecu === 0
            ? 'zero'
            : nbRecu < nbAttendu
              ? 'partiel'
              : 'plein'
        : statutFromTaux(taux);
    agregatsNational.push({
      formulaireId: fid,
      cle: 'NATIONAL',
      nbAttendu,
      nbRecu,
      nbRecuPlafond,
      taux,
      statut,
      nbEtablissements: sousAgregats.reduce((s, a) => s + a.nbEtablissements, 0),
    });
  }

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
    f07ParDistrict,
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

export { FORMULAIRES, getFormulaireConfig };
