import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { JaugeFormulaire } from '@/components/completude/jauge-formulaire';
import { GrilleDistricts } from '@/components/completude/grille-districts';
import { Tendance30j } from '@/components/completude/tendance-30j';
import { RafraichirBouton } from '@/components/completude/rafraichir-bouton';
import { buildDashboardState } from '@/lib/data/dashboard';
import { getDistricts } from '@/lib/referentiel/data';
import { FORMULAIRES, isDeploye } from '@/lib/kobo/formulaires';
import { seriesNationalesParFormulaire, nbJoursDisponibles } from '@/lib/db/snapshots';
import { formatDateTimeFr, formatInt } from '@/lib/utils';
import type { FormulaireId } from '@/lib/referentiel/types';
import Link from 'next/link';

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

export default async function HomePage() {
  const state = await buildDashboardState();
  const districts = getDistricts();
  const series = await seriesNationalesParFormulaire(30);
  const joursHisto = await nbJoursDisponibles();

  const alertes: { texte: string; href?: string }[] = [];
  // Districts avec 0 F01
  const f01Zero = state.f01ParDistrict.filter((c) => c.nbRecu === 0 && isDeploye('F01'));
  if (f01Zero.length > 0) {
    alertes.push({
      texte: `${f01Zero.length} district(s) sans fiche F01 (District RDM) : ${f01Zero.map((c) => c.etablissementCode).slice(0, 3).join(', ')}${f01Zero.length > 3 ? '…' : ''}.`,
      href: '/districts',
    });
  }
  // Établissements à 0 sur au moins un formulaire déployé
  const etabZero = new Set<string>();
  for (const c of state.parEtablissement) {
    if (c.nbRecu === 0 && isDeploye(c.formulaireId)) etabZero.add(c.etablissementCode);
  }
  if (etabZero.size > 0) {
    alertes.push({
      texte: `${etabZero.size} établissement(s) à 0 % sur au moins un formulaire déployé.`,
      href: '/anomalies',
    });
  }
  // Formulaires en erreur
  for (const f of state.formulaires) {
    if (f.erreur) {
      alertes.push({ texte: `Erreur Kobo sur ${f.id} : ${f.erreur.slice(0, 100)}…` });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Vue nationale</h1>
          <p className="text-sm text-muted-foreground">
            Données actualisées le {formatDateTimeFr(state.genereLe)} · {formatInt(state.formulaires.reduce((s, f) => s + f.nbSoumissions, 0))} soumissions Kobo agrégées.
          </p>
        </div>
        <RafraichirBouton />
      </div>

      {alertes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alertes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {alertes.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-statut-partiel" />
                {a.href ? (
                  <Link href={a.href} className="text-primary hover:underline">{a.texte}</Link>
                ) : (
                  <span>{a.texte}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Complétude nationale par formulaire
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {FORMULAIRES.map((f) => {
            const deploye = isDeploye(f.id);
            const info = state.formulaires.find((x) => x.id === f.id);
            const nbRecu = info?.nbSoumissions ?? 0;
            if (f.id === 'F07') {
              return (
                <JaugeFormulaire
                  key={f.id}
                  id={f.id}
                  libelle={f.libelleCourt}
                  taux={null}
                  statut="neutre"
                  nbRecu={nbRecu}
                  nbAttendu={null}
                  deploye={deploye}
                />
              );
            }
            const ag = state.agregatsNational.find((a) => a.formulaireId === f.id);
            return (
              <JaugeFormulaire
                key={f.id}
                id={f.id}
                libelle={f.libelleCourt}
                taux={ag?.taux ?? null}
                statut={ag?.statut ?? 'neutre'}
                nbRecu={ag?.nbRecu ?? 0}
                nbAttendu={ag?.nbAttendu ?? null}
                deploye={deploye}
              />
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Tendance (30 jours)
          </h2>
          <span className="text-xs text-muted-foreground">{joursHisto} jour(s) d&rsquo;historique</span>
        </div>
        <Card>
          <CardContent className="pt-6">
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
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Complétude par district
        </h2>
        <GrilleDistricts districts={districts} state={state} />
      </section>
    </div>
  );
}
