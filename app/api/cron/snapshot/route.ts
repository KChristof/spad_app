import { NextResponse } from 'next/server';
import { buildDashboardState } from '@/lib/data/dashboard';
import { getPrisma, baseDisponible } from '@/lib/db/prisma';
import { isDeploye } from '@/lib/kobo/formulaires';
import { getEtablissementByCode } from '@/lib/referentiel/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Route déclenchée par Vercel Cron (voir vercel.json — 03:00 UTC quotidien).
 * Recalcule l'état de complétude courant et enregistre un snapshot par
 * (établissement | district) × formulaire pour le jour.
 *
 * Protection : header `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, erreur: 'Non autorisé.' }, { status: 401 });
  }

  if (!baseDisponible()) {
    return NextResponse.json(
      { ok: false, erreur: 'DATABASE_URL non configuré — aucun snapshot enregistré.' },
      { status: 503 },
    );
  }

  const state = await buildDashboardState();
  const prisma = getPrisma();
  const jour = new Date();
  jour.setUTCHours(0, 0, 0, 0);

  interface Ligne {
    districtCode: string;
    etablissementCode: string; // '' pour agrégat district
    formulaireId: string;
    nbAttendu: number | null;
    nbRecu: number;
    nbRecuPlafond: number;
    tauxCompletude: number | null;
  }
  const plafond = (nbRecu: number, nbAttendu: number | null) =>
    nbAttendu !== null ? Math.min(nbRecu, nbAttendu) : nbRecu;
  const lignes: Ligne[] = [];

  // Lignes par établissement (F5/F6/F7/F8/F02)
  for (const c of state.parEtablissement) {
    const info = getEtablissementByCode(c.etablissementCode);
    if (!info) continue;
    lignes.push({
      districtCode: info.districtCode,
      etablissementCode: c.etablissementCode,
      formulaireId: c.formulaireId,
      nbAttendu: c.nbAttendu,
      nbRecu: c.nbRecu,
      nbRecuPlafond: plafond(c.nbRecu, c.nbAttendu),
      tauxCompletude: c.taux,
    });
  }
  // F01 — 1 par district
  for (const c of state.f01ParDistrict) {
    lignes.push({
      districtCode: c.etablissementCode, // pour F01, le champ contient le districtCode
      etablissementCode: '',
      formulaireId: 'F01',
      nbAttendu: c.nbAttendu,
      nbRecu: c.nbRecu,
      nbRecuPlafond: plafond(c.nbRecu, c.nbAttendu),
      tauxCompletude: c.taux,
    });
  }
  // F07 — cible plancher = somme_deces_f07_minimum du district
  if (isDeploye('F07')) {
    for (const c of state.f07ParDistrict) {
      const taux = c.cibleMinimum > 0 ? c.nbRecu / c.cibleMinimum : null;
      lignes.push({
        districtCode: c.districtCode,
        etablissementCode: '',
        formulaireId: 'F07',
        nbAttendu: c.cibleMinimum,
        nbRecu: c.nbRecu,
        // Pas de plafond pour F07 — dépasser le plancher est normal.
        nbRecuPlafond: c.nbRecu,
        tauxCompletude: taux,
      });
    }
  }

  let inserts = 0;
  let updates = 0;
  for (const l of lignes) {
    await prisma.completudeSnapshot.upsert({
      where: {
        snapshot_unique: {
          dateSnapshot: jour,
          districtCode: l.districtCode,
          etablissementCode: l.etablissementCode,
          formulaireId: l.formulaireId,
        },
      },
      create: {
        dateSnapshot: jour,
        districtCode: l.districtCode,
        etablissementCode: l.etablissementCode,
        formulaireId: l.formulaireId,
        nbAttendu: l.nbAttendu,
        nbRecu: l.nbRecu,
        nbRecuPlafond: l.nbRecuPlafond,
        tauxCompletude: l.tauxCompletude,
      },
      update: {
        nbAttendu: l.nbAttendu,
        nbRecu: l.nbRecu,
        nbRecuPlafond: l.nbRecuPlafond,
        tauxCompletude: l.tauxCompletude,
      },
    });
    // Compteurs indicatifs — Prisma ne dit pas si c'était create ou update dans un upsert.
    inserts++;
  }
  updates = 0; // volontaire — on n'a pas de moyen fiable de distinguer.

  return NextResponse.json({
    ok: true,
    date: jour.toISOString(),
    lignes: lignes.length,
    upserts: inserts,
  });
}
