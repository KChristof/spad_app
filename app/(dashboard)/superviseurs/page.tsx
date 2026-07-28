import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatutBadge, BadgeNonDeploye } from '@/components/completude/statut-badge';
import { getSuperviseurs, getDistrictByCode } from '@/lib/referentiel/data';
import { buildDashboardState } from '@/lib/data/dashboard';
import { isDeploye } from '@/lib/kobo/formulaires';

export const dynamic = 'force-dynamic';

export default async function SuperviseursPage() {
  const state = await buildDashboardState();
  const superviseurs = getSuperviseurs();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Superviseurs (12)</h1>
        <p className="text-sm text-muted-foreground">
          Un superviseur par district. F01 et F02 sont sous leur responsabilité.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Liste des superviseurs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Superviseur</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-center">F01</TableHead>
                <TableHead className="text-center">F02 (10 étab.)</TableHead>
                <TableHead className="text-center">F07 cohérence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {superviseurs.map((s) => {
                const d = getDistrictByCode(s.districtCode);
                const f01 = state.f01ParDistrict.find((x) => x.etablissementCode === s.districtCode);
                const agF02 = state.agregatsDistrict.find(
                  (a) => a.cle === s.districtCode && a.formulaireId === 'F02',
                );
                const f07 = state.f07Coherence.find((x) => x.districtCode === s.districtCode);
                return (
                  <TableRow key={s.code}>
                    <TableCell className="text-sm">{s.nom || s.libelleComplet}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <Link href={`/districts/${s.districtCode}`} className="hover:text-foreground">{d?.libelle}</Link>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{s.code}</TableCell>
                    <TableCell className="text-center">
                      {!isDeploye('F01') ? <BadgeNonDeploye /> : f01 ? <StatutBadge statut={f01.statut} taux={f01.taux} compact /> : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      {!isDeploye('F02') ? <BadgeNonDeploye /> : agF02 ? <StatutBadge statut={agF02.statut} taux={agF02.taux} compact /> : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      {!isDeploye('F07') ? <BadgeNonDeploye /> : f07 ? (
                        <span className={f07.ecart > 0 ? 'text-statut-partiel font-medium' : 'text-statut-plein'}>
                          {f07.ecart > 0 ? `−${f07.ecart} rev.` : 'OK'}
                        </span>
                      ) : '—'}
                    </TableCell>
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
