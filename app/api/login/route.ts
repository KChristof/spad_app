import { NextResponse } from 'next/server';
import { getSession, motDePasseAttendu } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let motDePasse = '';
  try {
    const body = await req.json().catch(() => null);
    if (body && typeof body.motDePasse === 'string') {
      motDePasse = body.motDePasse;
    } else {
      const form = await req.formData().catch(() => null);
      if (form) motDePasse = String(form.get('motDePasse') ?? '');
    }
  } catch {
    /* noop */
  }

  const attendu = motDePasseAttendu();
  if (!motDePasse || motDePasse !== attendu) {
    return NextResponse.json({ ok: false, erreur: 'Mot de passe incorrect.' }, { status: 401 });
  }

  const session = await getSession();
  session.authentifie = true;
  session.connecteLe = Date.now();
  await session.save();
  return NextResponse.json({ ok: true });
}
