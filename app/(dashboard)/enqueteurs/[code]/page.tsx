import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatutBadge, BadgeNonDeploye } from '@/components/completude/statut-badge';
import {
  getEnqueteurByCode,
  getDistrictByCode,
  getEtablissementsDuEnqueteur,
} from '@/lib/referentiel/data';
import { buildDashboardState } from '@/lib/data/dashboard';
import { isDeploye } from '@/lib/kobo/formulaires';
import type { FormulaireId } from '@/lib/referentiel/types';

export const dynamic = 'force-dynamic';

const FORMS_ENQ: FormulaireId[] = ['F5', 'F6', 'F7', 'F8'];

export default async function EnqueteurDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const enqueteur = getEnqueteurByCode(code);
  if (!enqueteur) notFound();
  const district = getDistrictByCode(enqueteur.districtCode);
  const etabs = getEtablissementsDuEnqueteur(enqueteur.code);
  const state = await buildDashboardState();

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-muted-foreground">
          <Link href="/enqueteurs" className="hover:text-foreground">Enquêteurs</Link>
          {' / '}
          {district && (
            <>
              <Link href={`/districts/${district.code}`} className="hover:text-foreground">{district.libelle}</Link>
              {' / '}
            </>
          )}
          <span className="text-foreground">{enqueteur.nom || enqueteur.code}</span>
        </div>
        <h1 className="text-xl font-semibold mt-1">{enqueteur.nom || enqueteur.libelleComplet}</h1>
        <div className="text-sm text-muted-foreground mt-0.5">
          Code : <span className="font-mono">{enqueteur.code}</span> ·
          District : {district?.libelle} ({district?.codeId})
        </div>
      </div>

      {etabs.map((etab) => (
        <Card key={etab.code}>
          <CardHeader>
            <CardTitle className="text-base">
              <Link href={`/etablissements/${encodeURIComponent(etab.code)}`} className="text-primary hover:underline">
                {etab.libelle}
              </Link>
            </CardTitle>
            <p className="text-xs text-muted-foreground">Type {etab.type} · {etab.code}</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Formulaire</TableHead>
                  <TableHead className="text-right">Reçu</TableHead>
                  <TableHead className="text-right">Cible</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  <TableHead>Anomalies</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FORMS_ENQ.map((fid) => {
                  const c = state.parEtablissement.find(
                    (x) => x.etablissementCode === etab.code && x.formulaireId === fid,
                  );
                  return (
                    <TableRow key={fid}>
                      <TableCell className="text-sm font-medium">{fid}</TableCell>
                      <TableCell className="num-cell text-sm">{c?.nbRecu ?? '—'}</TableCell>
                      <TableCell className="num-cell text-sm">{c?.nbAttendu ?? '—'}</TableCell>
                      <TableCell className="text-center">
                        {!isDeploye(fid) ? <BadgeNonDeploye /> : c ? <StatutBadge statut={c.statut} taux={c.taux} compact /> : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c?.anomalies.length ? c.anomalies.join(' · ') : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
