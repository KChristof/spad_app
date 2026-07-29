import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSuperviseurs, getDistrictByCode, getDistricts } from '@/lib/referentiel/data';
import { getTelephone } from '@/lib/referentiel/contacts';
import { buildDashboardState } from '@/lib/data/dashboard';
import { isDeploye } from '@/lib/kobo/formulaires';
import type { StatutCompletude } from '@/lib/completude/types';
import { SuperviseursTable, type SuperviseurRow } from './superviseurs-table';

export const dynamic = 'force-dynamic';

const PIRE_ORDRE: StatutCompletude[] = ['zero', 'partiel', 'exces', 'nonConcerne', 'neutre', 'plein'];
function pireStatut(a: StatutCompletude, b: StatutCompletude): StatutCompletude {
  return PIRE_ORDRE.indexOf(a) < PIRE_ORDRE.indexOf(b) ? a : b;
}

export default async function SuperviseursPage() {
  const state = await buildDashboardState();
  const superviseurs = getSuperviseurs();
  const districts = getDistricts();

  const rows: SuperviseurRow[] = superviseurs.map((s) => {
    const d = getDistrictByCode(s.districtCode);
    const f01 = state.f01ParDistrict.find((x) => x.etablissementCode === s.districtCode);
    const agF02 = state.agregatsDistrict.find(
      (a) => a.cle === s.districtCode && a.formulaireId === 'F02',
    );
    const f07 = state.f07ParDistrict.find((x) => x.districtCode === s.districtCode);

    let statutGlobal: StatutCompletude = 'plein';
    if (isDeploye('F01') && f01) statutGlobal = pireStatut(statutGlobal, f01.statut);
    if (isDeploye('F02') && agF02) statutGlobal = pireStatut(statutGlobal, agF02.statut);
    if (isDeploye('F07') && f07) statutGlobal = pireStatut(statutGlobal, f07.statut);

    return {
      code: s.code,
      nom: s.nom || s.libelleComplet,
      districtCode: s.districtCode,
      districtLibelle: d?.libelle ?? s.districtCode,
      telephone: getTelephone(s.code),
      f01Deploye: isDeploye('F01'),
      f01Statut: f01?.statut ?? 'neutre',
      f01Taux: f01?.taux ?? null,
      f02Deploye: isDeploye('F02'),
      f02Statut: agF02?.statut ?? 'neutre',
      f02Taux: agF02?.taux ?? null,
      f02NbRecu: agF02?.nbRecuPlafond ?? 0,
      f02NbAttendu: agF02?.nbAttendu ?? 0,
      f07Deploye: isDeploye('F07'),
      f07Statut: f07?.statut ?? 'neutre',
      f07NbRecu: f07?.nbRecu ?? 0,
      f07Cible: f07?.cibleMinimum ?? 0,
      statutGlobal,
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Superviseurs ({superviseurs.length})</h1>
        <p className="text-sm text-muted-foreground">
          Un superviseur par district — responsable des fiches RDM (district, établissement, grille de revue).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Liste des superviseurs</CardTitle>
        </CardHeader>
        <CardContent>
          <SuperviseursTable
            rows={rows}
            districtOptions={districts.map((d) => ({ code: d.code, libelle: d.libelle }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
