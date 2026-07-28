import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatutBadge, BadgeNonDeploye } from '@/components/completude/statut-badge';
import { getEnqueteurs, getDistrictByCode, getEtablissementsDuEnqueteur } from '@/lib/referentiel/data';
import { buildDashboardState } from '@/lib/data/dashboard';
import { FORMULAIRES, isDeploye } from '@/lib/kobo/formulaires';
import type { FormulaireId } from '@/lib/referentiel/types';

export const dynamic = 'force-dynamic';

export default async function EnqueteursPage() {
  const state = await buildDashboardState();
  const enqueteurs = getEnqueteurs();
  const FORMS_ENQ: FormulaireId[] = ['F5', 'F6', 'F7', 'F8'];

  const compByEtabFid = new Map<string, Map<FormulaireId, { taux: number | null; nbRecu: number; nbAttendu: number | null }>>();
  for (const c of state.parEtablissement) {
    if (!compByEtabFid.has(c.etablissementCode)) compByEtabFid.set(c.etablissementCode, new Map());
    compByEtabFid.get(c.etablissementCode)!.set(c.formulaireId as FormulaireId, {
      taux: c.taux,
      nbRecu: c.nbRecu,
      nbAttendu: c.nbAttendu,
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Enquêteurs (60)</h1>
        <p className="text-sm text-muted-foreground">
          Taux agrégé (F5/F6/F7/F8) par enquêteur, sur ses 2 établissements assignés.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Liste des enquêteurs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enquêteur</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Code</TableHead>
                {FORMS_ENQ.map((f) => (
                  <TableHead key={f} className="text-center">{f}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {enqueteurs.map((e) => {
                const d = getDistrictByCode(e.districtCode);
                const etabs = getEtablissementsDuEnqueteur(e.code);
                return (
                  <TableRow key={e.code}>
                    <TableCell>
                      <Link href={`/enqueteurs/${e.code}`} className="text-sm text-primary hover:underline">
                        {e.nom || e.libelleComplet}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d?.libelle ?? e.districtCode}</TableCell>
                    <TableCell className="text-xs font-mono">{e.code}</TableCell>
                    {FORMS_ENQ.map((fid) => {
                      if (!isDeploye(fid)) return <TableCell key={fid} className="text-center"><BadgeNonDeploye /></TableCell>;
                      let nbRecu = 0;
                      let nbAttendu = 0;
                      for (const etab of etabs) {
                        const c = compByEtabFid.get(etab.code)?.get(fid);
                        if (c && c.nbAttendu !== null) {
                          nbAttendu += c.nbAttendu;
                          nbRecu += Math.min(c.nbRecu, c.nbAttendu);
                        }
                      }
                      const taux = nbAttendu > 0 ? nbRecu / nbAttendu : null;
                      const statut =
                        taux === null ? 'neutre' :
                        taux === 0 ? 'zero' :
                        taux < 1 ? 'partiel' :
                        taux === 1 ? 'plein' : 'exces';
                      return (
                        <TableCell key={fid} className="text-center">
                          <StatutBadge statut={statut} taux={taux} compact />
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
