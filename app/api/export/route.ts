import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { estAuthentifie } from '@/lib/auth/session';
import { buildDashboardState } from '@/lib/data/dashboard';
import {
  getEtablissementByCode,
  getDistrictByCode,
  getRegionByCode,
} from '@/lib/referentiel/data';
import { getNom, getTelephone } from '@/lib/referentiel/contacts';
import { libelleStatut } from '@/lib/completude/statut';
import { getFormulaireConfig } from '@/lib/kobo/formulaires';
import type { FormulaireId } from '@/lib/referentiel/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function libelleFormulaire(id: FormulaireId): string {
  return getFormulaireConfig(id).libelle;
}

export async function GET(req: Request) {
  if (!(await estAuthentifie())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const state = await buildDashboardState();
  const url = new URL(req.url);
  const format = (url.searchParams.get('format') ?? 'csv').toLowerCase();

  interface Row {
    region: string;
    district: string;
    districtCodeId: string;
    etablissement: string;
    etablissementCode: string;
    type: string;
    enqueteur_nom: string;
    telephone: string;
    formulaire: string;
    cible: number | null;
    recu: number;
    taux_pct: number | null;
    statut: string;
    anomalies: string;
  }
  const rows: Row[] = [];

  for (const c of state.parEtablissement) {
    const etab = getEtablissementByCode(c.etablissementCode);
    const district = etab ? getDistrictByCode(etab.districtCode) : undefined;
    const region = etab ? getRegionByCode(etab.regionCode) : undefined;
    const enqCode = etab?.enqueteurCode ?? '';
    rows.push({
      region: region?.libelle ?? etab?.regionCode ?? '',
      district: district?.libelle ?? etab?.districtCode ?? '',
      districtCodeId: district?.codeId ?? '',
      etablissement: etab?.libelle ?? c.etablissementCode,
      etablissementCode: c.etablissementCode,
      type: etab?.type ?? '',
      enqueteur_nom: enqCode ? getNom(enqCode) : '',
      telephone: enqCode ? getTelephone(enqCode) : '',
      formulaire: libelleFormulaire(c.formulaireId),
      cible: c.nbAttendu,
      recu: c.nbRecu,
      taux_pct: c.taux !== null ? Math.round(c.taux * 1000) / 10 : null,
      statut: libelleStatut(c.statut),
      anomalies: c.anomalies.join(' | '),
    });
  }

  // F01 par district (pas d'établissement / enquêteur — c'est le superviseur)
  for (const c of state.f01ParDistrict) {
    const district = getDistrictByCode(c.etablissementCode);
    const region = district ? getRegionByCode(district.regionCode) : undefined;
    rows.push({
      region: region?.libelle ?? '',
      district: district?.libelle ?? c.etablissementCode,
      districtCodeId: district?.codeId ?? '',
      etablissement: '(niveau district)',
      etablissementCode: '',
      type: '',
      enqueteur_nom: '',
      telephone: '',
      formulaire: libelleFormulaire('F01'),
      cible: c.nbAttendu,
      recu: c.nbRecu,
      taux_pct: c.taux !== null ? Math.round(c.taux * 1000) / 10 : null,
      statut: libelleStatut(c.statut),
      anomalies: c.anomalies.join(' | '),
    });
  }

  // F07 par district — cible plancher, statut = plein si reçu >= cible
  for (const c of state.f07ParDistrict) {
    const district = getDistrictByCode(c.districtCode);
    const region = district ? getRegionByCode(district.regionCode) : undefined;
    const taux = c.cibleMinimum > 0 ? Math.round((c.nbRecu / c.cibleMinimum) * 1000) / 10 : null;
    rows.push({
      region: region?.libelle ?? '',
      district: district?.libelle ?? c.districtCode,
      districtCodeId: district?.codeId ?? '',
      etablissement: '(niveau district)',
      etablissementCode: '',
      type: '',
      enqueteur_nom: '',
      telephone: '',
      formulaire: libelleFormulaire('F07'),
      cible: c.cibleMinimum,
      recu: c.nbRecu,
      taux_pct: taux,
      statut: libelleStatut(c.statut),
      anomalies:
        c.nbRecu < c.cibleMinimum
          ? `Reste ${c.cibleMinimum - c.nbRecu} revue(s) pour atteindre le plancher.`
          : '',
    });
  }

  const filename = `spad-completude-${new Date().toISOString().slice(0, 10)}`;

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Completude');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  // CSV — séparateur ; (Excel FR-friendly), BOM UTF-8
  const cols = Object.keys(rows[0] ?? {}) as (keyof Row)[];
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(';') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = cols.join(';');
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(';')).join('\n');
  const csv = `${header}\n${body}`;
  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  });
}
