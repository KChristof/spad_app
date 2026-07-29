import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEnqueteurs, getDistrictByCode, getEtablissementsDuEnqueteur, getDistricts } from '@/lib/referentiel/data';
import { getTelephone } from '@/lib/referentiel/contacts';
import { buildDashboardState } from '@/lib/data/dashboard';
import { isDeploye } from '@/lib/kobo/formulaires';
import type { FormulaireId } from '@/lib/referentiel/types';
import type { StatutCompletude } from '@/lib/completude/types';
import { EnqueteursTable, type EnqueteurRow } from './enqueteurs-table';

export const dynamic = 'force-dynamic';

const FORMS: FormulaireId[] = ['F5', 'F6', 'F7', 'F8'];

const PIRE_ORDRE: StatutCompletude[] = ['zero', 'partiel', 'exces', 'nonConcerne', 'neutre', 'plein'];
function pireStatut(a: StatutCompletude, b: StatutCompletude): StatutCompletude {
  return PIRE_ORDRE.indexOf(a) < PIRE_ORDRE.indexOf(b) ? a : b;
}

export default async function EnqueteursPage() {
  const state = await buildDashboardState();
  const enqueteurs = getEnqueteurs();
  const districts = getDistricts();

  const compByEtabFid = new Map<
    string,
    Map<FormulaireId, { taux: number | null; nbRecu: number; nbAttendu: number | null; statut: StatutCompletude }>
  >();
  for (const c of state.parEtablissement) {
    if (!compByEtabFid.has(c.etablissementCode)) compByEtabFid.set(c.etablissementCode, new Map());
    compByEtabFid.get(c.etablissementCode)!.set(c.formulaireId as FormulaireId, {
      taux: c.taux,
      nbRecu: c.nbRecu,
      nbAttendu: c.nbAttendu,
      statut: c.statut,
    });
  }

  const rows: EnqueteurRow[] = enqueteurs.map((e) => {
    const d = getDistrictByCode(e.districtCode);
    const etabs = getEtablissementsDuEnqueteur(e.code);
    const formulaires: EnqueteurRow['formulaires'] = {} as EnqueteurRow['formulaires'];
    let statutGlobal: StatutCompletude = 'plein';

    for (const fid of FORMS) {
      const deploye = isDeploye(fid);
      if (!deploye) {
        formulaires[fid] = { deploye: false, taux: null, statut: 'neutre', nbRecu: 0, nbAttendu: 0 };
        continue;
      }
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
      const statut: StatutCompletude =
        taux === null ? 'neutre' :
        taux === 0 ? 'zero' :
        taux < 1 ? 'partiel' :
        taux === 1 ? 'plein' : 'exces';
      formulaires[fid] = { deploye: true, taux, statut, nbRecu, nbAttendu };
      statutGlobal = pireStatut(statutGlobal, statut);
    }
    // F01/F02/F07 non applicables — restant à 'plein' si tout est OK, sinon le pire déjà pris.

    return {
      code: e.code,
      nom: e.nom || e.libelleComplet,
      districtCode: e.districtCode,
      districtLibelle: d?.libelle ?? e.districtCode,
      telephone: getTelephone(e.code),
      formulaires,
      statutGlobal,
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Enquêteurs ({enqueteurs.length})</h1>
        <p className="text-sm text-muted-foreground">
          Taux agrégé (F5/F6/F7/F8) par enquêteur sur ses 2 établissements assignés.
          Recherche par nom, code, district ou téléphone.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Liste des enquêteurs</CardTitle>
        </CardHeader>
        <CardContent>
          <EnqueteursTable
            rows={rows}
            districtOptions={districts.map((d) => ({ code: d.code, libelle: d.libelle }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
