import 'server-only';
import { getPrisma, baseDisponible } from './prisma';
import type { FormulaireId } from '@/lib/referentiel/types';

export interface SnapshotSerie {
  date: string; // ISO
  taux: number | null;
  nbRecu: number;
  nbAttendu: number | null;
}

/**
 * Retourne la série des N derniers jours (par défaut 30) du taux national
 * pour chaque formulaire. Agrège toutes les lignes par formulaire × date.
 * Renvoie [] si la base n'est pas configurée (dashboard fonctionne quand même).
 */
export async function seriesNationalesParFormulaire(
  jours = 30,
): Promise<Record<FormulaireId, SnapshotSerie[]>> {
  const vide: Record<FormulaireId, SnapshotSerie[]> = {
    F5: [], F6: [], F7: [], F8: [], F01: [], F02: [], F07: [],
  };
  if (!baseDisponible()) return vide;

  const prisma = getPrisma();
  const debut = new Date();
  debut.setUTCHours(0, 0, 0, 0);
  debut.setUTCDate(debut.getUTCDate() - jours);

  try {
    const rows = await prisma.completudeSnapshot.groupBy({
      by: ['dateSnapshot', 'formulaireId'],
      where: { dateSnapshot: { gte: debut } },
      _sum: { nbAttendu: true, nbRecu: true, nbRecuPlafond: true },
      orderBy: { dateSnapshot: 'asc' },
    });

    const acc: Record<FormulaireId, SnapshotSerie[]> = { ...vide };
    for (const r of rows) {
      const fid = r.formulaireId as FormulaireId;
      if (!acc[fid]) continue;
      const nbAttendu = r._sum.nbAttendu ?? 0;
      const nbRecu = r._sum.nbRecu ?? 0;
      const nbRecuPlafond = r._sum.nbRecuPlafond ?? 0;
      const taux = nbAttendu > 0 ? nbRecuPlafond / nbAttendu : null;
      acc[fid].push({
        date: r.dateSnapshot.toISOString(),
        taux,
        nbRecu,
        nbAttendu: nbAttendu || null,
      });
    }
    return acc;
  } catch (e) {
    // La base peut être temporairement indisponible — on n'empêche pas l'affichage courant.
    console.warn('[snapshots] Lecture impossible:', e instanceof Error ? e.message : e);
    return vide;
  }
}

export async function serieDistrict(
  districtCode: string,
  jours = 30,
): Promise<Record<FormulaireId, SnapshotSerie[]>> {
  const vide: Record<FormulaireId, SnapshotSerie[]> = {
    F5: [], F6: [], F7: [], F8: [], F01: [], F02: [], F07: [],
  };
  if (!baseDisponible()) return vide;

  const prisma = getPrisma();
  const debut = new Date();
  debut.setUTCHours(0, 0, 0, 0);
  debut.setUTCDate(debut.getUTCDate() - jours);

  try {
    const rows = await prisma.completudeSnapshot.groupBy({
      by: ['dateSnapshot', 'formulaireId'],
      where: { dateSnapshot: { gte: debut }, districtCode },
      _sum: { nbAttendu: true, nbRecu: true, nbRecuPlafond: true },
      orderBy: { dateSnapshot: 'asc' },
    });

    const acc: Record<FormulaireId, SnapshotSerie[]> = { ...vide };
    for (const r of rows) {
      const fid = r.formulaireId as FormulaireId;
      if (!acc[fid]) continue;
      const nbAttendu = r._sum.nbAttendu ?? 0;
      const nbRecu = r._sum.nbRecu ?? 0;
      const nbRecuPlafond = r._sum.nbRecuPlafond ?? 0;
      const taux = nbAttendu > 0 ? nbRecuPlafond / nbAttendu : null;
      acc[fid].push({
        date: r.dateSnapshot.toISOString(),
        taux,
        nbRecu,
        nbAttendu: nbAttendu || null,
      });
    }
    return acc;
  } catch (e) {
    console.warn('[snapshots] Lecture district impossible:', e instanceof Error ? e.message : e);
    return vide;
  }
}

export async function nbJoursDisponibles(): Promise<number> {
  if (!baseDisponible()) return 0;
  try {
    const prisma = getPrisma();
    const rows = await prisma.completudeSnapshot.findMany({
      select: { dateSnapshot: true },
      distinct: ['dateSnapshot'],
    });
    return rows.length;
  } catch {
    return 0;
  }
}
