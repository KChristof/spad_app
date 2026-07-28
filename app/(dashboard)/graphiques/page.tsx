import { buildDashboardState } from '@/lib/data/dashboard';
import { getDistricts } from '@/lib/referentiel/data';
import { FORMULAIRES, isDeploye } from '@/lib/kobo/formulaires';
import { GraphiquesClient } from './graphiques-client';

export const dynamic = 'force-dynamic';

/**
 * Serveur : agrège une seule fois les données puis les passe au client,
 * qui gère les filtres sans nouvel appel Kobo (spec Affinement §7).
 */
export default async function GraphiquesPage() {
  const state = await buildDashboardState();
  const districts = getDistricts();

  const donnees = FORMULAIRES.filter((f) => isDeploye(f.id) && f.id !== 'F07').flatMap((f) =>
    districts.map((d) => {
      const ag = state.agregatsDistrict.find(
        (a) => a.cle === d.code && a.formulaireId === f.id,
      );
      return {
        formulaireId: f.id,
        formulaireLibelle: f.libelle,
        formulaireLibelleCourt: f.libelleCourt,
        districtCode: d.code,
        districtLibelle: d.libelle,
        districtCodeId: d.codeId,
        taux: ag?.taux ?? null,
        nbRecu: ag?.nbRecu ?? 0,
        nbAttendu: ag?.nbAttendu ?? 0,
        statut: ag?.statut ?? 'neutre',
      };
    }),
  );

  const formulairesDisponibles = FORMULAIRES
    .filter((f) => isDeploye(f.id) && f.id !== 'F07')
    .map((f) => ({ id: f.id, libelle: f.libelle }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Graphiques et analyses</h1>
        <p className="text-sm text-muted-foreground">
          Visualisation dynamique — filtres appliqués côté client, aucune requête Kobo
          supplémentaire.
        </p>
      </div>
      <GraphiquesClient
        donnees={donnees}
        formulairesDisponibles={formulairesDisponibles}
        districtsDisponibles={districts.map((d) => ({
          code: d.code,
          libelle: d.libelle,
          codeId: d.codeId,
        }))}
      />
    </div>
  );
}
