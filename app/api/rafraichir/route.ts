import { NextResponse } from 'next/server';
import { estAuthentifie } from '@/lib/auth/session';
import { invalidateAllCache } from '@/lib/kobo/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vide le cache mémoire Kobo (voir bloc CACHE dans lib/kobo/client.ts).
 * Le prochain rendu de page relira les 7 formulaires depuis Kobo.
 *
 * Note: le cache est module-scope donc par Function instance sur Vercel —
 * cette route n'invalide que l'instance qui la sert. C'est acceptable
 * pour un dashboard interne à faible concurrence : les autres instances
 * expireront naturellement dans les 5 min du TTL.
 */
export async function POST() {
  if (!(await estAuthentifie())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  invalidateAllCache();
  return NextResponse.json({ ok: true });
}
