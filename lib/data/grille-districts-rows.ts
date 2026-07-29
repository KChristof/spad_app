import 'server-only';

import type { DashboardState } from './dashboard';
import type { District } from '@/lib/referentiel/types';
import type { FormulaireId } from '@/lib/referentiel/types';
import type { StatutCompletude } from '@/lib/completude/types';
import { FORMULAIRES, isDeploye } from '@/lib/kobo/formulaires';
import { getRegionByCode } from '@/lib/referentiel/data';
import type { DistrictGridRow } from '@/components/completude/grille-districts';

const PIRE_ORDRE: StatutCompletude[] = ['zero', 'partiel', 'exces', 'nonConcerne', 'neutre', 'plein'];
function pireStatut(a: StatutCompletude, b: StatutCompletude): StatutCompletude {
  return PIRE_ORDRE.indexOf(a) < PIRE_ORDRE.indexOf(b) ? a : b;
}

export function buildGrilleDistrictsRows(
  districts: District[],
  state: DashboardState,
): DistrictGridRow[] {
  return districts.map((d) => {
    const region = getRegionByCode(d.regionCode);
    const formulaires: DistrictGridRow['formulaires'] = {} as DistrictGridRow['formulaires'];
    let statutGlobal: StatutCompletude = 'plein';

    for (const f of FORMULAIRES) {
      if (f.id === 'F07') continue; // traité séparément
      if (!isDeploye(f.id)) {
        formulaires[f.id] = { deploye: false, taux: null, statut: 'neutre', nbRecu: 0, nbAttendu: null };
        continue;
      }
      const ag = state.agregatsDistrict.find((a) => a.cle === d.code && a.formulaireId === f.id);
      formulaires[f.id] = {
        deploye: true,
        taux: ag?.taux ?? null,
        statut: ag?.statut ?? 'neutre',
        nbRecu: ag?.nbRecu ?? 0,
        nbAttendu: ag?.nbAttendu ?? null,
      };
      if (ag?.statut) statutGlobal = pireStatut(statutGlobal, ag.statut);
    }

    const f07 = state.f07ParDistrict.find((x) => x.districtCode === d.code);
    if (isDeploye('F07') && f07) statutGlobal = pireStatut(statutGlobal, f07.statut);

    return {
      districtCode: d.code,
      districtLibelle: d.libelle,
      districtCodeId: d.codeId,
      regionCode: d.regionCode,
      regionLibelle: region?.libelle ?? d.regionCode,
      formulaires,
      f07NbRecu: f07?.nbRecu ?? 0,
      f07Cible: f07?.cibleMinimum ?? 0,
      f07Statut: f07?.statut ?? 'neutre',
      statutGlobal,
    };
  });
}
