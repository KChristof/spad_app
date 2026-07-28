import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatutBadge, BadgeNonDeploye } from '@/components/completude/statut-badge';
import { Tendance30j } from '@/components/completude/tendance-30j';
import { buildDashboardState } from '@/lib/data/dashboard';
import {
  getDistrictByCode,
  getEnqueteursDuDistrict,
  getSuperviseurDuDistrict,
  getEtablissementsDuDistrict,
  getRegionByCode,
} from '@/lib/referentiel/data';
import { FORMULAIRES, isDeploye } from '@/lib/kobo/formulaires';
import { serieDistrict } from '@/lib/db/snapshots';
import { formatInt } from '@/lib/utils';
import type { FormulaireId } from '@/lib/referentiel/types';

export const dynamic = 'force-dynamic';

const COULEURS_LIGNES: Record<FormulaireId, string> = {
  F5: '#0f766e',
  F6: '#0369a1',
  F7: '#7c3aed',
  F8: '#dc2626',
  F01: '#f59e0b',
  F02: '#059669',
  F07: '#6366f1',
};

export default async function DistrictDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const district = getDistrictByCode(code);
  if (!district) notFound();
  const region = getRegionByCode(district.regionCode);
  const superviseur = getSuperviseurDuDistrict(district.code);
  const enqueteurs = getEnqueteursDuDistrict(district.code);
  const etablissements = getEtablissementsDuDistrict(district.code);

  const state = await buildDashboardState();
  const series = await serieDistrict(district.code, 30);

  const f07 = state.f07Coherence.find((x) => x.districtCode === district.code);
  const f01 = state.f01ParDistrict.find((x) => x.etablissementCode === district.code);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-muted-foreground">
          <Link href="/districts" className="hover:text-foreground">Districts</Link>
          {' / '}
          {region && (
            <span>
              {region.libelle}
              {' / '}
            </span>
          )}
          <span className="text-foreground">{district.libelle}</span>
        </div>
        <h1 className="text-xl font-semibold mt-1">
          {district.libelle} <span className="text-sm font-normal text-muted-foreground">({district.codeId})</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Superviseur</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {superviseur ? (
              <>
                <div className="font-medium">{superviseur.nom}</div>
                <div className="text-xs text-muted-foreground">Code: {superviseur.code}</div>
              </>
            ) : (
              <div className="text-muted-foreground">Non renseigné</div>
            )}
            <div className="pt-2 mt-2 border-t space-y-1">
              <div className="text-xs uppercase text-muted-foreground tracking-wide">F01 — Fiche district</div>
              {!isDeploye('F01') ? (
                <BadgeNonDeploye />
              ) : f01 ? (
                <div className="flex items-center gap-2">
                  <StatutBadge statut={f01.statut} taux={f01.taux} compact />
                  <span className="text-xs text-muted-foreground">{f01.nbRecu} / 1</span>
                </div>
              ) : null}
            </div>
            <div className="pt-2 mt-2 border-t space-y-1">
              <div className="text-xs uppercase text-muted-foreground tracking-wide">
                F07 — Cohérence revue décès maternels
              </div>
              {!isDeploye('F07') ? (
                <BadgeNonDeploye />
              ) : f07 ? (
                <div className="text-xs space-y-0.5">
                  <div>Fiches F07 reçues : <span className="font-medium">{f07.nbF07}</span></div>
                  <div>Décès notifiés (F01) : {f07.nbDecesRevusDeclaresF01}</div>
                  <div>Décès revus cumulés (F02) : {f07.nbDecesRevusDeclaresF02}</div>
                  {f07.ecart > 0 ? (
                    <div className="text-statut-partiel font-medium mt-1">
                      Écart : {f07.ecart} revue(s) manquante(s)
                    </div>
                  ) : (
                    <div className="text-statut-plein mt-1">Cohérent</div>
                  )}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Enquêteurs ({enqueteurs.length})</CardTitle>
            <CardDescription>Chaque enquêteur suit 2 établissements du district.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enquêteur</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Étab.</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enqueteurs.map((e) => (
                  <TableRow key={e.code}>
                    <TableCell className="text-sm">
                      <Link href={`/enqueteurs/${e.code}`} className="text-primary hover:underline">
                        {e.nom || e.libelleComplet}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.code}</TableCell>
                    <TableCell className="num-cell text-xs">
                      {formatInt(etablissements.filter((et) => et.enqueteurCode === e.code).length)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Établissements ({etablissements.length})</CardTitle>
          <CardDescription>Grille croisée établissement × formulaire.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Établissement</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Enquêteur</TableHead>
                {FORMULAIRES.filter((f) => f.categorie === 'enqueteur' || f.id === 'F02').map((f) => (
                  <TableHead key={f.id} className="text-center">{f.id}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {etablissements.map((e) => {
                return (
                  <TableRow key={e.code}>
                    <TableCell>
                      <Link href={`/etablissements/${encodeURIComponent(e.code)}`} className="text-sm text-primary hover:underline">
                        {e.libelle}
                      </Link>
                      <div className="text-xs text-muted-foreground">{e.codeId} · {e.code}</div>
                    </TableCell>
                    <TableCell className="text-xs">{e.type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.enqueteurCode}</TableCell>
                    {FORMULAIRES.filter((f) => f.categorie === 'enqueteur' || f.id === 'F02').map((f) => {
                      if (!isDeploye(f.id)) {
                        return <TableCell key={f.id} className="text-center"><BadgeNonDeploye /></TableCell>;
                      }
                      const c = state.parEtablissement.find(
                        (x) => x.etablissementCode === e.code && x.formulaireId === f.id,
                      );
                      return (
                        <TableCell key={f.id} className="text-center">
                          {c ? <StatutBadge statut={c.statut} taux={c.taux} compact /> : '—'}
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

      <Card>
        <CardHeader>
          <CardTitle>Tendance 30 jours</CardTitle>
          <CardDescription>Évolution du taux de complétude par formulaire pour ce district.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tendance30j
            series={FORMULAIRES.filter((f) => isDeploye(f.id) && f.id !== 'F07').map((f) => ({
              id: f.id,
              libelle: f.id,
              couleur: COULEURS_LIGNES[f.id],
              points: series[f.id],
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
