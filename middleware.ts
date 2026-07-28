import { NextResponse, type NextRequest } from 'next/server';

/**
 * Protège toutes les routes du dashboard sauf /login et les endpoints
 * publics (assets, cron, /api/login). L'authentification se fait ensuite
 * via un cookie `spad_session` signé par iron-session (voir lib/auth/session.ts).
 *
 * On ne vérifie ici que la *présence* du cookie — la vérification cryptographique
 * complète est effectuée côté serveur (Server Components / route handlers)
 * via `estAuthentifie()`. Le middleware Next tourne sur l'Edge Runtime et ne
 * peut pas déchiffrer iron-session (dépendance Node), un simple gate suffit.
 */

const PUBLIC_PATHS = new Set(['/login']);
const PUBLIC_API_PREFIXES = ['/api/login', '/api/logout', '/api/cron'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const cookie = req.cookies.get('spad_session');
  if (!cookie || !cookie.value) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image, favicon, static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
