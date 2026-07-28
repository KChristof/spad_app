import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { estAuthentifie } from '@/lib/auth/session';
import { buildDashboardState } from '@/lib/data/dashboard';
import {
  getEtablissementByCode,
  getDistrictByCode,
  getRegionByCode,
} from '@/lib/referentiel/data';
import { libelleStatut } from '@/lib/completude/statut';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await estAuthentifie())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const state = await buildDashboardState();
  const url = new URL(req.url);
  const format = (url.searchParams.get('format') ?? 'csv').toLowerCase();

  const rows: Record<string, string | number | null>[] = [];
  for (const c of state.parEtablissement) {
    const etab = getEtablissementByCode(c.etablissementCode);
    const district = etab ? getDistrictByCode(etab.districtCode) : undefined;
    const region = etab ? getRegionByCode(etab.regionCode) : undefined;
    rows.push({
      region: region?.libelle ?? etab?.regionCode ?? '',
      district: district?.libelle ?? etab?.districtCode ?? '',
      districtCodeId: district?.codeId ?? '',
      etablissement: etab?.libelle ?? c.etablissementCode,
      etablissementCode: c.etablissementCode,
      type: etab?.type ?? '',
      enqueteur: etab?.enqueteurCode ?? '',
      formulaire: c.formulaireId,
      cible: c.nbAttendu,
      recu: c.nbRecu,
      taux_pct: c.taux !== null ? Math.round(c.taux * 1000) / 10 : null,
      statut: libelleStatut(c.statut),
      anomalies: c.anomalies.join(' | '),
    });
  }
  // Ajouter F01 par district
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
      enqueteur: '',
      formulaire: 'F01',
      cible: c.nbAttendu,
      recu: c.nbRecu,
      taux_pct: c.taux !== null ? Math.round(c.taux * 1000) / 10 : null,
      statut: libelleStatut(c.statut),
      anomalies: c.anomalies.join(' | '),
    });
  }
  // F07 : cohérence par district (pas de taux)
  for (const c of state.f07Coherence) {
    const district = getDistrictByCode(c.districtCode);
    const region = district ? getRegionByCode(district.regionCode) : undefined;
    rows.push({
      region: region?.libelle ?? '',
      district: district?.libelle ?? c.districtCode,
      districtCodeId: district?.codeId ?? '',
      etablissement: '(niveau district)',
      etablissementCode: '',
      type: '',
      enqueteur: '',
      formulaire: 'F07',
      cible: null,
      recu: c.nbF07,
      taux_pct: null,
      statut: c.statut === 'ok' ? 'Cohérent' : 'Écart',
      anomalies: c.ecart > 0 ? `Écart: ${c.ecart} revue(s) manquante(s)` : '',
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

  // CSV — séparateur ; (Excel FR-friendly)
  const cols = Object.keys(rows[0] ?? {});
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
