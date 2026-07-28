import 'server-only';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

/**
 * Client Prisma avec adaptateur Neon serverless.
 * — En prod (Vercel), DATABASE_URL est injecté par l'intégration Neon Marketplace.
 * — En local, DATABASE_URL peut pointer vers Neon (recommandé) ou Supabase.
 * — Si DATABASE_URL est absent, on lance une erreur claire au premier appel
 *   (utile pour que le dev voie qu'il doit brancher la base).
 */

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL non configuré. Ajouter l\'intégration Neon depuis le Marketplace Vercel, ou renseigner DATABASE_URL dans .env.local.',
    );
  }
  // L'adaptateur Neon utilise WebSocket / fetch — parfait pour serverless
  // (Vercel Functions, Edge éventuellement).
  const adapter = new PrismaNeon({ connectionString: url });
  return new PrismaClient({ adapter });
}

export function getPrisma(): PrismaClient {
  if (!globalThis._prisma) {
    globalThis._prisma = createClient();
  }
  return globalThis._prisma;
}

/**
 * True si DATABASE_URL est présent — permet à l'UI d'éviter d'appeler la base
 * quand elle n'est pas encore configurée (pré-mise en prod).
 */
export function baseDisponible(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
