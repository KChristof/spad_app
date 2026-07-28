import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatutBadge, BadgeNonDeploye } from '@/components/completude/statut-badge';
import { buildDashboardState } from '@/lib/data/dashboard';
import { getRegions, getDistrictsDeLaRegion } from '@/lib/referentiel/data';
import { FORMULAIRES, isDeploye } from '@/lib/kobo/formulaires';

export const dynamic = 'force-dynamic';

export default async function RegionsPage() {
  const state = await buildDashboardState();
  const regions = getRegions();

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Région</TableHead>
                <TableHead className="text-right">Districts</TableHead>
                {FORMULAIRES.filter((f) => f.id !== 'F07').map((f) => (
                  <TableHead key={f.id} className="text-center">{f.id}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {regions.map((r) => {
                const districts = getDistrictsDeLaRegion(r.code);
                return (
                  <TableRow key={r.code}>
                    <TableCell>
                      <div className="font-medium">{r.libelle}</div>
                      <div className="text-xs text-muted-foreground">
                        {districts.map((d) => (
                          <Link key={d.code} href={`/districts/${d.code}`} className="mr-2 hover:text-foreground">
                            {d.libelle}
                          </Link>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="num-cell">{districts.length}</TableCell>
                    {FORMULAIRES.filter((f) => f.id !== 'F07').map((f) => {
                      if (!isDeploye(f.id)) {
                        return <TableCell key={f.id} className="text-center"><BadgeNonDeploye /></TableCell>;
                      }
                      const ag = state.agregatsRegion.find(
                        (a) => a.cle === r.code && a.formulaireId === f.id,
                      );
                      return (
                        <TableCell key={f.id} className="text-center">
                          {ag ? <StatutBadge statut={ag.statut} taux={ag.taux} compact /> : '—'}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
