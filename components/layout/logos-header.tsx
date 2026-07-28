import Image from 'next/image';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Bandeau institutionnel : Ministère de la Santé (Côte d'Ivoire),
 * Direction de l'Information Sanitaire, OMS (partenaire technique et financier).
 *
 * Fallback silencieux si un fichier manque dans /public/logos/ : on n'affiche
 * simplement pas le logo concerné (pas d'icône cassée). Vérification faite au
 * runtime serveur — la home étant SSR, c'est fait à chaque requête (coût
 * négligeable, 3 fs.existsSync).
 */

const LOGOS = [
  {
    file: 'ministere-sante.png',
    alt: 'Ministère de la Santé, de l’Hygiène Publique et de la Couverture Maladie Universelle',
    label: 'Ministère de la Santé, de l’Hygiène Publique et de la CMU',
  },
  {
    file: 'dis.png',
    alt: 'Direction de l’Information Sanitaire',
    label: 'Direction de l’Information Sanitaire (DIS)',
  },
  {
    file: 'oms.png',
    alt: 'Organisation Mondiale de la Santé',
    label: 'OMS · Partenaire technique et financier',
  },
];

export function LogosHeader() {
  const dir = path.resolve(process.cwd(), 'public', 'logos');
  const disponibles = LOGOS.map((l) => ({
    ...l,
    exists: fs.existsSync(path.join(dir, l.file)),
  }));

  return (
    <div className="border-b bg-white">
      <div className="container flex flex-wrap items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-6">
          {disponibles.map((l) =>
            l.exists ? (
              <div key={l.file} className="flex items-center gap-2">
                <Image
                  src={`/logos/${l.file}`}
                  alt={l.alt}
                  width={120}
                  height={48}
                  className="h-12 w-auto object-contain"
                  priority={l.file === 'ministere-sante.png'}
                />
                <span className="hidden lg:block text-[10px] uppercase tracking-wide text-muted-foreground max-w-[180px] leading-tight">
                  {l.label}
                </span>
              </div>
            ) : null,
          )}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div className="font-medium text-primary">SPAD 2026 · Phase pilote</div>
          <div>Système de Production et d’Analyse des Données</div>
        </div>
      </div>
    </div>
  );
}
