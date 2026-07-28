import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatutBadge } from '@/components/completude/statut-badge';
import { buildDashboardState } from '@/lib/data/dashboard';
import {
  getEtablissementByCode,
  getDistricts,
} from '@/lib/referentiel/data';
import { isDeploye } from '@/lib/kobo/formulaires';
import type { FormulaireId } from '@/lib/referentiel/types';

export const dynamic = 'force-dynamic';

export default async function AnomaliesPage() {
  const state = await buildDashboardState();

  const zeros = state.parEtablissement.filter(
    (c) => c.nbRecu === 0 && isDeploye(c.formulaireId),
  );
  const exces = state.parEtablissement.filter((c) => c.statut === 'exces');
  const doublons = state.parEtablissement.filter((c) => c.anomalies.length > 0 && c.statut !== 'exces');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Anomalies</h1>
        <p className="text-sm text-muted-foreground">
          Vue consolidée des cas nécessitant une action ou une vérification.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Établissements à 0 % ({zeros.length})</CardTitle>
          <CardDescription>Aucune soumission reçue pour un formulaire déployé.</CardDescription>
        </CardHeader>
        <CardContent>
          {zeros.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun établissement à 0 %.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Établissement</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Formulaire</TableHead>
                  <TableHead>Cible</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zeros.slice(0, 200).map((c, i) => {
                  const etab = getEtablissementByCode(c.etablissementCode);
                  return (
                    <TableRow key={`${c.etablissementCode}-${c.formulaireId}-${i}`}>
                      <TableCell>
                        <Link href={`/etablissements/${encodeURIComponent(c.etablissementCode)}`} className="text-primary hover:underline text-sm">
                          {etab?.libelle ?? c.etablissementCode}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">{etab?.districtCode}</TableCell>
                      <TableCell className="text-sm">{c.formulaireId}</TableCell>
                      <TableCell className="num-cell text-xs">{c.nbAttendu ?? '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Excès (soumissions au-delà de la cible) ({exces.length})</CardTitle>
          <CardDescription>Peut indiquer des doublons — à examiner sur Kobo.</CardDescription>
        </CardHeader>
        <CardContent>
          {exces.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun excès détecté.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Établissement</TableHead>
                  <TableHead>Formulaire</TableHead>
                  <TableHead className="text-right">Reçu / Cible</TableHead>
                  <TableHead>Anomalies</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exces.map((c, i) => {
                  const etab = getEtablissementByCode(c.etablissementCode);
                  return (
                    <TableRow key={`${c.etablissementCode}-${c.formulaireId}-${i}`}>
                      <TableCell>
                        <Link href={`/etablissements/${encodeURIComponent(c.etablissementCode)}`} className="text-primary hover:underline text-sm">
                          {etab?.libelle ?? c.etablissementCode}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{c.formulaireId}</TableCell>
                      <TableCell className="num-cell text-xs">{c.nbRecu} / {c.nbAttendu ?? '—'}</TableCell>
                      <TableCell className="text-xs">{c.anomalies.join(' · ')}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Doublons et autres anomalies ({doublons.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {doublons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune autre anomalie.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {doublons.map((c, i) => {
                const etab = getEtablissementByCode(c.etablissementCode);
                return (
                  <li key={i} className="flex items-start gap-2">
                    <StatutBadge statut={c.statut} taux={c.taux} compact />
                    <div>
                      <Link href={`/etablissements/${encodeURIComponent(c.etablissementCode)}`} className="text-primary hover:underline">
                        {etab?.libelle ?? c.etablissementCode}
                      </Link>
                      {' — '}
                      <span className="text-muted-foreground">{c.formulaireId}: {c.anomalies.join(' · ')}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Profil superviseur sur un formulaire enquêteur</CardTitle>
            <CardDescription>
              Soumissions F5/F6/F7/F8 avec Profil_Collecteur__X = superviseur — à signaler comme cas particulier.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {state.anomalies.profilCollecteurSuperviseurSurFormEnqueteur === 0
              ? 'Aucun cas.'
              : `${state.anomalies.profilCollecteurSuperviseurSurFormEnqueteur} soumission(s).`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Établissements de type inconnu</CardTitle>
            <CardDescription>
              Type absent du référentiel — la cible F6 par défaut vaut 1.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {state.anomalies.etablissementsTypeInconnu.length === 0
              ? 'Aucun.'
              : state.anomalies.etablissementsTypeInconnu.join(', ')}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Écarts de cohérence F07 (par district)</CardTitle>
          <CardDescription>
            F07 n&rsquo;a pas de cible fixe — on compare le nombre de fiches F07 aux décès notifiés/revus déclarés dans F01/F02.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>District</TableHead>
                <TableHead className="text-right">F07 reçues</TableHead>
                <TableHead className="text-right">Notif. F01</TableHead>
                <TableHead className="text-right">Revus F02 cumul.</TableHead>
                <TableHead className="text-right">Écart</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getDistricts().map((d) => {
                const c = state.f07Coherence.find((x) => x.districtCode === d.code);
                return (
                  <TableRow key={d.code}>
                    <TableCell>
                      <Link href={`/districts/${d.code}`} className="text-sm text-primary hover:underline">
                        {d.libelle}
                      </Link>
                    </TableCell>
                    <TableCell className="num-cell text-sm">{c?.nbF07 ?? 0}</TableCell>
                    <TableCell className="num-cell text-sm">{c?.nbDecesRevusDeclaresF01 ?? 0}</TableCell>
                    <TableCell className="num-cell text-sm">{c?.nbDecesRevusDeclaresF02 ?? 0}</TableCell>
                    <TableCell className={`num-cell text-sm ${c && c.ecart > 0 ? 'text-statut-partiel font-medium' : ''}`}>
                      {c?.ecart ?? 0}
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
