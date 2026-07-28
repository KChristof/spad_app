import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatutBadge, BadgeNonDeploye } from '@/components/completude/statut-badge';
import { buildDashboardState } from '@/lib/data/dashboard';
import {
  getEtablissementByCode,
  getDistrictByCode,
  getEnqueteurByCode,
} from '@/lib/referentiel/data';
import { FORMULAIRES, isDeploye } from '@/lib/kobo/formulaires';
import type { FormulaireId } from '@/lib/referentiel/types';
import { cibleF6ParType } from '@/lib/referentiel/types';
import { Progress } from '@/components/ui/progress';
import { formatInt, formatPercent } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const LIBELLES_PROFESSIONS: Record<string, string> = {
  medecin: 'Médecin / Gynécologue',
  infirmier: 'Infirmier',
  sage_femme_ou_maieuticien: 'Sage-femme / Maïeuticien',
};

export default async function EtablissementDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const decoded = decodeURIComponent(code);
  const etab = getEtablissementByCode(decoded);
  if (!etab) notFound();
  const district = getDistrictByCode(etab.districtCode);
  const enqueteur = getEnqueteurByCode(etab.enqueteurCode);

  const state = await buildDashboardState();

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-muted-foreground">
          <Link href="/districts" className="hover:text-foreground">Districts</Link>
          {district && (
            <>
              {' / '}
              <Link href={`/districts/${district.code}`} className="hover:text-foreground">
                {district.libelle}
              </Link>
            </>
          )}
          {' / '}
          <span className="text-foreground">{etab.libelle}</span>
        </div>
        <h1 className="text-xl font-semibold mt-1">{etab.libelle}</h1>
        <div className="mt-1 text-sm text-muted-foreground">
          Type <span className="font-medium">{etab.type}</span> ·
          Code Kobo <span className="font-mono text-xs">{etab.code}</span>
          {enqueteur && (
            <> · Enquêteur <Link className="text-primary hover:underline" href={`/enqueteurs/${enqueteur.code}`}>{enqueteur.nom || enqueteur.code}</Link></>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['F5', 'F6', 'F7', 'F8', 'F02'] as FormulaireId[]).map((fid) => {
          const cfg = FORMULAIRES.find((f) => f.id === fid)!;
          const deploye = isDeploye(fid);
          const c = state.parEtablissement.find(
            (x) => x.etablissementCode === etab.code && x.formulaireId === fid,
          );
          return (
            <Card key={fid}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm">{fid} — {cfg.libelleCourt}</CardTitle>
                    <CardDescription className="mt-0.5 text-xs">{cfg.libelle}</CardDescription>
                  </div>
                  {!deploye ? <BadgeNonDeploye /> : c ? <StatutBadge statut={c.statut} taux={c.taux} compact /> : null}
                </div>
              </CardHeader>
              <CardContent>
                {!deploye ? (
                  <p className="text-xs text-muted-foreground">Ce formulaire n&rsquo;est pas encore déployé.</p>
                ) : c ? (
                  <>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground text-xs">
                        {formatInt(c.nbRecu)} / {c.nbAttendu !== null ? formatInt(c.nbAttendu) : '—'}
                      </span>
                      <span className="num-cell font-medium">{formatPercent(c.taux)}</span>
                    </div>
                    <Progress className="mt-2" value={c.taux !== null ? Math.min(100, c.taux * 100) : 0} />
                    {fid === 'F6' && c.detailF6 && (
                      <div className="mt-3 space-y-1 text-xs">
                        <div className="uppercase tracking-wide text-muted-foreground">
                          Cible F6 = {cibleF6ParType(etab.type)} — détail par profession :
                        </div>
                        {c.detailF6.attendus.map((p) => (
                          <div key={p} className="flex items-center gap-2">
                            <span aria-hidden className={c.detailF6!.obtenus.includes(p) ? 'text-statut-plein' : 'text-statut-zero'}>
                              {c.detailF6!.obtenus.includes(p) ? '✓' : '✗'}
                            </span>
                            <span>{LIBELLES_PROFESSIONS[p] ?? p}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {c.anomalies.length > 0 && (
                      <ul className="mt-3 space-y-1 text-xs text-statut-partiel">
                        {c.anomalies.map((a, i) => (<li key={i}>· {a}</li>))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Aucune donnée.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
