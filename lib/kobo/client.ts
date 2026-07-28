import 'server-only';

import type { FormulaireId } from '@/lib/referentiel/types';
import type { SoumissionKobo } from './types';
import { getAssetUid, isDeploye, getFormulaireConfig } from './formulaires';

/**
 * Client KoboToolbox — appels serveur uniquement.
 * Token API jamais exposé au navigateur (module `server-only`).
 *
 * API v2 documentation: https://kobo.humanitarianresponse.info/api/v2/
 *
 * CACHE : on N'UTILISE PAS le Data Cache de Next.js (`{ next: { revalidate } }`)
 * parce que ses entrées sont plafonnées à 2 Mo et les payloads Kobo (F7 en
 * particulier, avec 15 ménages × 120 établissements) dépassent facilement
 * cette limite. À la place, on garde un `Map` au niveau du module (une
 * instance par Function invocation Vercel — c'est très bien pour un cache)
 * avec un TTL manuel de 5 min et une invalidation à la demande depuis
 * `/api/rafraichir`.
 */

const KOBO_PAGE_SIZE = 3000; // Kobo cap le limit à ~3-5k par page
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface KoboResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export class KoboError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'KoboError';
    this.status = status;
  }
}

interface CacheEntry {
  data: SoumissionKobo[];
  fetchedAt: number;
}

// Cache module-scope : partagé entre requêtes servies par la même Function
// instance sur Vercel. À froid, l'entrée est simplement recréée.
const cache = new Map<string, CacheEntry>();

function baseUrl(): string {
  const v = process.env.KOBO_BASE_URL;
  if (!v) throw new KoboError('KOBO_BASE_URL manquant');
  return v.replace(/\/+$/, '');
}

function apiToken(): string {
  const v = process.env.KOBO_API_TOKEN;
  if (!v) throw new KoboError('KOBO_API_TOKEN manquant');
  return v;
}

/**
 * Récupère l'ensemble des soumissions d'un formulaire Kobo.
 * — Suit la pagination `next` de l'API v2.
 * — Retourne un tableau vide si le formulaire n'est pas encore déployé
 *   (asset UID absent en variable d'env). Cet état n'est PAS une erreur.
 * — Cache mémoire manuel (5 min) — voir bloc « CACHE » en tête de fichier.
 */
export async function fetchSoumissions(
  id: FormulaireId,
  opts: { bypassCache?: boolean } = {},
): Promise<SoumissionKobo[]> {
  if (!isDeploye(id)) return [];

  const uid = getAssetUid(id)!;
  const now = Date.now();
  const hit = cache.get(uid);
  if (!opts.bypassCache && hit && now - hit.fetchedAt < CACHE_TTL_MS) {
    return hit.data;
  }

  const url = new URL(`${baseUrl()}/api/v2/assets/${uid}/data.json`);
  url.searchParams.set('limit', String(KOBO_PAGE_SIZE));

  const all: SoumissionKobo[] = [];
  let nextUrl: string | null = url.toString();
  let pages = 0;
  const maxPages = 50; // garde-fou

  while (nextUrl && pages < maxPages) {
    const res: Response = await fetch(nextUrl, {
      headers: {
        Authorization: `Token ${apiToken()}`,
        Accept: 'application/json',
      },
      // Explicitement pas de Data Cache Next — les payloads dépassent 2 Mo
      // et déclenchent des warnings « Failed to set fetch cache ».
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new KoboError(
        `Erreur Kobo ${id} (${res.status}): ${text.slice(0, 200)}`,
        res.status,
      );
    }

    const payload = (await res.json()) as KoboResponse<SoumissionKobo>;
    all.push(...payload.results);
    nextUrl = payload.next;
    pages++;
  }

  cache.set(uid, { data: all, fetchedAt: now });
  return all;
}

/** Vide le cache pour un formulaire donné. */
export function invalidateCache(id: FormulaireId): void {
  const uid = getAssetUid(id);
  if (uid) cache.delete(uid);
}

/** Vide le cache pour tous les formulaires. Appelé par /api/rafraichir. */
export function invalidateAllCache(): void {
  cache.clear();
}

export interface FormulaireDonnees {
  id: FormulaireId;
  deploye: boolean;
  soumissions: SoumissionKobo[];
  erreur: string | null;
}

/**
 * Version tolérante aux erreurs — utilisée par la couche d'affichage :
 * on ne veut pas qu'un formulaire en panne casse tout le dashboard.
 */
export async function fetchSoumissionsSafe(id: FormulaireId): Promise<FormulaireDonnees> {
  const deploye = isDeploye(id);
  if (!deploye) {
    return { id, deploye: false, soumissions: [], erreur: null };
  }
  try {
    const soumissions = await fetchSoumissions(id);
    return { id, deploye: true, soumissions, erreur: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { id, deploye: true, soumissions: [], erreur: msg };
  }
}

/** Récupère les données des 7 formulaires en parallèle. */
export async function fetchTousLesFormulaires(): Promise<FormulaireDonnees[]> {
  const ids: FormulaireId[] = ['F5', 'F6', 'F7', 'F8', 'F01', 'F02', 'F07'];
  return Promise.all(ids.map(fetchSoumissionsSafe));
}

export { getFormulaireConfig };
