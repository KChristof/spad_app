import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GrilleDistricts } from '@/components/completude/grille-districts';
import { buildGrilleDistrictsRows } from '@/lib/data/grille-districts-rows';
import { buildDashboardState } from '@/lib/data/dashboard';
import { getDistricts, getRegions } from '@/lib/referentiel/data';

export const dynamic = 'force-dynamic';

export default async function DistrictsPage() {
  const state = await buildDashboardState();
  const districts = getDistricts();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Vue par district</h1>
        <p className="text-sm text-muted-foreground">
          Complétude par district × formulaire. Recherche, filtres et tri disponibles.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>12 districts pilotes</CardTitle>
        </CardHeader>
        <CardContent>
          <GrilleDistricts
            rows={buildGrilleDistrictsRows(districts, state)}
            regionOptions={getRegions().map((r) => ({ code: r.code, libelle: r.libelle }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
