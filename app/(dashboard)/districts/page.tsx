import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GrilleDistricts } from '@/components/completude/grille-districts';
import { buildDashboardState } from '@/lib/data/dashboard';
import { getDistricts } from '@/lib/referentiel/data';

export const dynamic = 'force-dynamic';

export default async function DistrictsPage() {
  const state = await buildDashboardState();
  const districts = getDistricts();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Vue par district</h1>
        <p className="text-sm text-muted-foreground">
          Complétude par district × formulaire. Cliquer sur un district pour ouvrir le détail établissements.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>12 districts pilotes</CardTitle>
        </CardHeader>
        <CardContent>
          <GrilleDistricts districts={districts} state={state} />
        </CardContent>
      </Card>
    </div>
  );
}
