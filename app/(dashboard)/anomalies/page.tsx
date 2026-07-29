import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { buildDashboardState } from '@/lib/data/dashboard';
import { getEtablissementByCode, getDistrictByCode, getDistricts } from '@/lib/referentiel/data';
import { isDeploye, getFormulaireConfig, FORMULAIRES } from '@/lib/kobo/formulaires';
import type { FormulaireId } from '@/lib/referentiel/types';
import {
  TableZeros,
  TableExces,
  TableHorsListe,
  TableF07District,
  type ZeroRow,
  type ExcesRow,
  type HorsListeRow,
  type F07Row,
} from './anomalies-tables';

export const dynamic = 'force-dynamic';

export default async function AnomaliesPage() {
  const state = await buildDashboardState();
  const districts = getDistricts();
  const districtOptions = districts.map((d) => ({ code: d.code, libelle: d.libelle }));
  const formulaireOptions = FORMULAIRES.map((f) => ({ id: f.id, libelle: f.libelleCourt }));

  // 1. Zéros — établissements sans aucune soumission pour un formulaire déployé
  //    (on ignore les "nonConcerne", ce ne sont pas des anomalies).
  const zeros: ZeroRow[] = state.parEtablissement
    .filter((c) => c.nbRecu === 0 && c.statut !== 'nonConcerne' && isDeploye(c.formulaireId))
    .map((c) => {
      const etab = getEtablissementByCode(c.etablissementCode);
      const district = etab ? getDistrictByCode(etab.districtCode) : undefined;
      return {
        etablissementCode: c.etablissementCode,
        etablissementLibelle: etab?.libelle ?? c.etablissementCode,
        districtCode: etab?.districtCode ?? '',
        districtLibelle: district?.libelle ?? etab?.districtCode ?? '',
        formulaireId: c.formulaireId,
        formulaireLibelle: getFormulaireConfig(c.formulaireId).libelleCourt,
        nbAttendu: c.nbAttendu,
      };
    });

  // 2. Excès — soumissions au-delà de la cible
  const exces: ExcesRow[] = state.parEtablissement
    .filter((c) => c.statut === 'exces')
    .map((c) => {
      const etab = getEtablissementByCode(c.etablissementCode);
      const district = etab ? getDistrictByCode(etab.districtCode) : undefined;
      return {
        etablissementCode: c.etablissementCode,
        etablissementLibelle: etab?.libelle ?? c.etablissementCode,
        districtCode: etab?.districtCode ?? '',
        districtLibelle: district?.libelle ?? etab?.districtCode ?? '',
        formulaireId: c.formulaireId,
        formulaireLibelle: getFormulaireConfig(c.formulaireId).libelleCourt,
        nbRecu: c.nbRecu,
        nbAttendu: c.nbAttendu,
        taux: c.taux,
        statut: c.statut,
        anomalies: c.anomalies.join(' · '),
      };
    });

  // Agrégat excès par formulaire (pour la vue nationale, mais aussi affiché
  // ici pour donner un aperçu rapide)
  const excesParForm = new Map<FormulaireId, number>();
  for (const c of exces) {
    const fid = c.formulaireId as FormulaireId;
    excesParForm.set(fid, (excesParForm.get(fid) ?? 0) + 1);
  }

  // 3. F02 hors liste — soumissions positives (décès découvert sur le terrain)
  const horsListe: HorsListeRow[] = state.f02HorsListe.map((h) => {
    const etab = getEtablissementByCode(h.etablissementCode);
    const district = getDistrictByCode(h.districtCode);
    return {
      etablissementCode: h.etablissementCode,
      etablissementLibelle: etab?.libelle ?? h.etablissementCode,
      districtCode: h.districtCode,
      districtLibelle: district?.libelle ?? h.districtCode,
      nbRecu: h.nbRecu,
    };
  });

  // 4. F07 par district
  const f07Rows: F07Row[] = state.f07ParDistrict.map((c) => {
    const d = getDistrictByCode(c.districtCode);
    return {
      districtCode: c.districtCode,
      districtLibelle: d?.libelle ?? c.districtCode,
      nbRecu: c.nbRecu,
      cibleMinimum: c.cibleMinimum,
      reste: Math.max(0, c.cibleMinimum - c.nbRecu),
      notifF01: c.nbDecesRevusDeclaresF01,
      revusF02: c.nbDecesRevusDeclaresF02,
      statut: c.statut,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Anomalies et signalements</h1>
        <p className="text-sm text-muted-foreground">
          Cas nécessitant une action de vérification, doublons potentiels, et découvertes
          positives (décès trouvés hors liste initiale).
        </p>
      </div>

      {/* Zéros */}
      <Card>
        <CardHeader>
          <CardTitle>Établissements à 0 % ({zeros.length})</CardTitle>
          <CardDescription>Aucune soumission reçue pour un formulaire déployé.</CardDescription>
        </CardHeader>
        <CardContent>
          {zeros.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun établissement à 0 %.</p>
          ) : (
            <TableZeros rows={zeros} districtOptions={districtOptions} formulaireOptions={formulaireOptions} />
          )}
        </CardContent>
      </Card>

      {/* Excès */}
      <Card>
        <CardHeader>
          <CardTitle>Excès — soumissions au-delà de la cible ({exces.length})</CardTitle>
          <CardDescription>
            Peut indiquer des doublons — à examiner sur Kobo.
            {excesParForm.size > 0 && (
              <> Par formulaire : {Array.from(excesParForm.entries())
                .map(([fid, n]) => `${getFormulaireConfig(fid).libelleCourt} : ${n}`)
                .join(' · ')}.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exces.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun excès détecté.</p>
          ) : (
            <TableExces rows={exces} districtOptions={districtOptions} formulaireOptions={formulaireOptions} />
          )}
        </CardContent>
      </Card>

      {/* F02 hors liste — section POSITIVE, distincte des anomalies de saisie */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <CardTitle>Fiches F02 « hors liste » ({horsListe.length})</CardTitle>
              <CardDescription>
                Fiches F02 soumises pour des établissements qui n&rsquo;étaient <em>pas</em> dans la
                liste initiale d&rsquo;audit — potentiellement des <strong>décès maternels
                découverts sur le terrain</strong> par les superviseurs. C&rsquo;est le but même
                de la revue des décès maternels : à valider, pas à corriger.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TableHorsListe rows={horsListe} districtOptions={districtOptions} />
        </CardContent>
      </Card>

      {/* Autres signaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Profil superviseur sur un formulaire enquêteur</CardTitle>
            <CardDescription>
              Soumissions F5/F6/F7/F8 avec Profil_Collecteur__X = superviseur — à signaler comme cas particulier.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {state.anomalies.profilCollecteurSuperviseurSurFormEnqueteur === 0
              ? 'Aucun cas.'
              : `${state.anomalies.profilCollecteurSuperviseurSurFormEnqueteur} soumission(s).`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Établissements de type inconnu</CardTitle>
            <CardDescription>
              Type absent du référentiel — la cible F6 par défaut vaut 1.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {state.anomalies.etablissementsTypeInconnu.length === 0
              ? 'Aucun.'
              : state.anomalies.etablissementsTypeInconnu.join(', ')}
          </CardContent>
        </Card>
      </div>

      {/* F07 par district */}
      <Card>
        <CardHeader>
          <CardTitle>RDM — Grille de revue (F07) par district</CardTitle>
          <CardDescription>
            Cible = somme des décès maternels notifiés au SIG dans les établissements audités.
            C&rsquo;est un plancher — dépasser cette valeur est normal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TableF07District rows={f07Rows} districtOptions={districtOptions} />
        </CardContent>
      </Card>
    </div>
  );
}
