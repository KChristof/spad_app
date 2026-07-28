import 'server-only';
import { cookies } from 'next/headers';
import { getIronSession, type SessionOptions } from 'iron-session';

export interface SessionData {
  authentifie?: boolean;
  connecteLe?: number;
}

function getSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      'SESSION_SECRET manquant ou trop court (32 caractères minimum). Générer avec `openssl rand -base64 32`.',
    );
  }
  return {
    password,
    cookieName: 'spad_session',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12, // 12 h
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export async function estAuthentifie(): Promise<boolean> {
  const session = await getSession();
  return session.authentifie === true;
}

export function motDePasseAttendu(): string {
  const v = process.env.DASHBOARD_PASSWORD;
  if (!v) throw new Error('DASHBOARD_PASSWORD non configuré.');
  return v;
}
