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
import type { StatutCompletude } from '@/lib/completude/types';
import { EtablissementsTable, type EtabDistrictRow } from './etablissements-table';

const PIRE_ORDRE: StatutCompletude[] = ['zero', 'partiel', 'exces', 'nonConcerne', 'neutre', 'plein'];
function pireStatut(a: StatutCompletude, b: StatutCompletude): StatutCompletude {
  return PIRE_ORDRE.indexOf(a) < PIRE_ORDRE.indexOf(b) ? a : b;
}
const FORMS_ETAB_LIST: FormulaireId[] = ['F5', 'F6', 'F7', 'F8', 'F02'];

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

  const f07 = state.f07ParDistrict.find((x) => x.districtCode === district.code);
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
              <div className="text-xs uppercase text-muted-foreground tracking-wide">RDM — Fiche district</div>
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
                RDM — Grille de revue (F07)
              </div>
              {!isDeploye('F07') ? (
                <BadgeNonDeploye />
              ) : f07 ? (
                <div className="text-xs space-y-0.5">
                  <div className="flex items-center gap-2">
                    <StatutBadge statut={f07.statut} compact />
                    <span className="tabular-nums">
                      {f07.nbRecu} / {f07.cibleMinimum} minimum
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    Cible = somme des décès notifiés au SIG (plancher, dépassement autorisé).
                  </div>
                  <div className="text-muted-foreground pt-1">
                    Cohérence déclaratifs · notifiés F01 : {f07.nbDecesRevusDeclaresF01}
                    {' · '}revus cumulés F02 : {f07.nbDecesRevusDeclaresF02}
                  </div>
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
          <CardDescription>Grille croisée établissement × formulaire — filtres et recherche disponibles.</CardDescription>
        </CardHeader>
        <CardContent>
          <EtablissementsTable
            rows={etablissements.map<EtabDistrictRow>((e) => {
              const formulaires = {} as EtabDistrictRow['formulaires'];
              let statutGlobal: StatutCompletude = 'plein';
              for (const fid of FORMS_ETAB_LIST) {
                if (!isDeploye(fid)) {
                  formulaires[fid] = { deploye: false, taux: null, statut: 'neutre' };
                  continue;
                }
                const c = state.parEtablissement.find(
                  (x) => x.etablissementCode === e.code && x.formulaireId === fid,
                );
                formulaires[fid] = {
                  deploye: true,
                  taux: c?.taux ?? null,
                  statut: c?.statut ?? 'neutre',
                };
                if (c?.statut) statutGlobal = pireStatut(statutGlobal, c.statut);
              }
              return {
                code: e.code,
                codeId: e.codeId,
                libelle: e.libelle,
                type: e.type,
                enqueteurCode: e.enqueteurCode,
                formulaires,
                statutGlobal,
              };
            })}
            typeOptions={Array.from(new Set(etablissements.map((e) => e.type))).sort()}
          />
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
              libelle: f.libelleCourt,
              couleur: COULEURS_LIGNES[f.id],
              points: series[f.id],
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
