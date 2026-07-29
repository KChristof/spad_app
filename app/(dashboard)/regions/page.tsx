import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildDashboardState } from '@/lib/data/dashboard';
import { getRegions, getDistrictsDeLaRegion } from '@/lib/referentiel/data';
import { isDeploye } from '@/lib/kobo/formulaires';
import type { StatutCompletude } from '@/lib/completude/types';
import { RegionsTable, REGIONS_TABLE_FORMS, type RegionRow } from './regions-table';

export const dynamic = 'force-dynamic';

const PIRE_ORDRE: StatutCompletude[] = ['zero', 'partiel', 'exces', 'nonConcerne', 'neutre', 'plein'];
function pireStatut(a: StatutCompletude, b: StatutCompletude): StatutCompletude {
  return PIRE_ORDRE.indexOf(a) < PIRE_ORDRE.indexOf(b) ? a : b;
}

export default async function RegionsPage() {
  const state = await buildDashboardState();
  const regions = getRegions();

  const rows: RegionRow[] = regions.map((r) => {
    const districts = getDistrictsDeLaRegion(r.code);
    const formulaires: RegionRow['formulaires'] = {} as RegionRow['formulaires'];
    let statutGlobal: StatutCompletude = 'plein';
    for (const fid of REGIONS_TABLE_FORMS) {
      if (!isDeploye(fid)) {
        formulaires[fid] = { deploye: false, taux: null, statut: 'neutre' };
        continue;
      }
      const ag = state.agregatsRegion.find((a) => a.cle === r.code && a.formulaireId === fid);
      formulaires[fid] = {
        deploye: true,
        taux: ag?.taux ?? null,
        statut: ag?.statut ?? 'neutre',
      };
      if (ag?.statut) statutGlobal = pireStatut(statutGlobal, ag.statut);
    }
    return {
      regionCode: r.code,
      regionLibelle: r.libelle,
      nbDistricts: districts.length,
      districtsLabels: districts.map((d) => d.libelle),
      formulaires,
      statutGlobal,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Vue par région</h1>
        <p className="text-sm text-muted-foreground">
          Complétude agrégée pour chacune des 12 régions sanitaires pilotes.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Régions</CardTitle>
        </CardHeader>
        <CardContent>
          <RegionsTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
