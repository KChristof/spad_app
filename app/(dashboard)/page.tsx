import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JaugeFormulaire } from '@/components/completude/jauge-formulaire';
import { GrilleDistricts } from '@/components/completude/grille-districts';
import { buildGrilleDistrictsRows } from '@/lib/data/grille-districts-rows';
import { getRegions } from '@/lib/referentiel/data';
import { Tendance30j } from '@/components/completude/tendance-30j';
import { RafraichirBouton } from '@/components/completude/rafraichir-bouton';
import { PanneauAlertes, type Alerte } from '@/components/completude/panneau-alertes';
import { GridSkeleton } from '@/components/completude/skeleton';
import { CountUp } from '@/components/completude/count-up';
import { buildDashboardState } from '@/lib/data/dashboard';
import { getDistricts } from '@/lib/referentiel/data';
import { FORMULAIRES, isDeploye, LEGENDE_ACRONYMES } from '@/lib/kobo/formulaires';
import { seriesNationalesParFormulaire, nbJoursDisponibles } from '@/lib/db/snapshots';
import { formatDateTimeFr } from '@/lib/utils';
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

async function VueNationaleContent() {
  const state = await buildDashboardState();
  const districts = getDistricts();
  const series = await seriesNationalesParFormulaire(30);
  const joursHisto = await nbJoursDisponibles();

  const alertes: Alerte[] = [];
  const f01Zero = state.f01ParDistrict.filter((c) => c.nbRecu === 0 && isDeploye('F01'));
  if (f01Zero.length > 0) {
    alertes.push({
      texte: `${f01Zero.length} district(s) sans fiche RDM district : ${f01Zero.map((c) => c.etablissementCode).slice(0, 3).join(', ')}${f01Zero.length > 3 ? '…' : ''}.`,
      href: '/districts',
      severite: 'attention',
    });
  }
  const etabZero = new Set<string>();
  for (const c of state.parEtablissement) {
    // On ignore les "nonConcerne" pour éviter des faux positifs.
    if (c.nbRecu === 0 && c.statut !== 'nonConcerne' && isDeploye(c.formulaireId)) {
      etabZero.add(c.etablissementCode);
    }
  }
  if (etabZero.size > 0) {
    alertes.push({
      texte: `${etabZero.size} établissement(s) à 0 % sur au moins un formulaire déployé.`,
      href: '/anomalies',
      severite: 'attention',
    });
  }
  // Chantier 5.1 — alerte agrégée pour les excès (doublons potentiels).
  const excesParFid = new Map<FormulaireId, number>();
  for (const c of state.parEtablissement) {
    if (c.statut === 'exces') {
      excesParFid.set(c.formulaireId, (excesParFid.get(c.formulaireId) ?? 0) + 1);
    }
  }
  const totalExces = Array.from(excesParFid.values()).reduce((s, n) => s + n, 0);
  if (totalExces > 0) {
    const detail = Array.from(excesParFid.entries())
      .map(([fid, n]) => `${FORMULAIRES.find((f) => f.id === fid)?.libelleCourt ?? fid} : ${n}`)
      .join(' · ');
    alertes.push({
      texte: `${totalExces} soumission(s) au-delà de la cible (doublons potentiels) — ${detail}.`,
      href: '/anomalies',
      severite: 'attention',
    });
  }
  // Chantier 5.2 — signalement positif F02 hors liste
  if (state.f02HorsListe.length > 0) {
    const nb = state.f02HorsListe.length;
    alertes.push({
      texte: `${nb} fiche(s) F02 « hors liste » — décès potentiellement découvert(s) sur le terrain. À valider.`,
      href: '/anomalies',
      severite: 'info',
    });
  }
  for (const f of state.formulaires) {
    if (f.erreur) {
      alertes.push({
        texte: `Erreur Kobo sur ${f.id} : ${f.erreur.slice(0, 100)}…`,
        severite: 'critique',
      });
    }
  }

  const totalSoumissions = state.formulaires.reduce((s, f) => s + f.nbSoumissions, 0);
  const nbFormsDeployes = state.formulaires.filter((f) => f.deploye).length;
  // Taux global (moyenne pondérée) — ignore F07 (cible plancher variable)
  const globalAg = state.agregatsNational.filter((a) => a.formulaireId !== 'F07' && a.nbAttendu > 0);
  const globalAttendu = globalAg.reduce((s, a) => s + a.nbAttendu, 0);
  const globalRecu = globalAg.reduce((s, a) => s + a.nbRecuPlafond, 0);
  const tauxGlobal = globalAttendu > 0 ? (globalRecu / globalAttendu) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Vue nationale</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Conçu pour l&rsquo;équipe de coordination <span className="font-medium text-foreground">UGP SPAD</span>.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Données actualisées le {formatDateTimeFr(state.genereLe)}
          </p>
        </div>
        <RafraichirBouton />
      </div>

      {/* Bandeau KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="motion-safe:animate-[fadeInUp_.35s_ease-out_both]">
          <CardContent className="pt-6 pb-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Taux global</div>
            <div className="mt-1 text-3xl font-semibold text-foreground tabular-nums">
              <CountUp value={tauxGlobal} decimals={0} suffix=" %" />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Moyenne pondérée · hors RDM Grille
            </div>
          </CardContent>
        </Card>
        <Card className="motion-safe:animate-[fadeInUp_.35s_ease-out_both]" style={{ animationDelay: '60ms' }}>
          <CardContent className="pt-6 pb-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Soumissions Kobo</div>
            <div className="mt-1 text-3xl font-semibold text-foreground tabular-nums">
              <CountUp value={totalSoumissions} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Agrégées, tous formulaires</div>
          </CardContent>
        </Card>
        <Card className="motion-safe:animate-[fadeInUp_.35s_ease-out_both]" style={{ animationDelay: '120ms' }}>
          <CardContent className="pt-6 pb-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Formulaires actifs</div>
            <div className="mt-1 text-3xl font-semibold text-foreground tabular-nums">
              <CountUp value={nbFormsDeployes} />
              <span className="text-muted-foreground text-xl">/7</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Kobo — déploiement en cours</div>
          </CardContent>
        </Card>
        <Card className="motion-safe:animate-[fadeInUp_.35s_ease-out_both]" style={{ animationDelay: '180ms' }}>
          <CardContent className="pt-6 pb-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Districts pilotes</div>
            <div className="mt-1 text-3xl font-semibold text-foreground tabular-nums">
              <CountUp value={districts.length} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">120 établissements · 60 enquêteurs</div>
          </CardContent>
        </Card>
      </div>

      <PanneauAlertes alertes={alertes} />

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Complétude nationale par formulaire
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {FORMULAIRES.map((f, i) => {
            const deploye = isDeploye(f.id);
            const info = state.formulaires.find((x) => x.id === f.id);
            const nbRecu = info?.nbSoumissions ?? 0;
            const ag = state.agregatsNational.find((a) => a.formulaireId === f.id);
            return (
              <JaugeFormulaire
                key={f.id}
                id={f.id}
                libelle={f.libelle}
                taux={ag?.taux ?? null}
                statut={ag?.statut ?? 'neutre'}
                nbRecu={ag?.nbRecu ?? nbRecu}
                nbAttendu={ag?.nbAttendu ?? null}
                deploye={deploye}
                index={i}
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
                libelle: f.libelleCourt,
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
        <GrilleDistricts
          rows={buildGrilleDistrictsRows(districts, state)}
          regionOptions={getRegions().map((r) => ({ code: r.code, libelle: r.libelle }))}
        />
      </section>

      <section className="pt-4 border-t">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Légende — </span>
          {LEGENDE_ACRONYMES.map((a, i) => (
            <span key={a.acr}>
              <span className="font-medium text-foreground">{a.acr}</span> {a.libelle}
              {i < LEGENDE_ACRONYMES.length - 1 && ' · '}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted/70" />
          </div>
          <GridSkeleton items={4} />
          <GridSkeleton items={7} />
        </div>
      }
    >
      <VueNationaleContent />
    </Suspense>
  );
}
