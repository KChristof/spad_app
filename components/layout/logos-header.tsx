import Image from 'next/image';

/**
 * Bandeau institutionnel : Ministère de la Santé (Côte d'Ivoire),
 * Direction de l'Information Sanitaire, OMS (partenaire technique et financier).
 *
 * Les 3 fichiers sont versionnés dans /public/logos/ ; sur Vercel ils sont
 * servis directement par le CDN à /logos/xxx.png. On NE fait plus de
 * fs.existsSync ici : `public/` n'est pas embarqué dans le bundle serverless
 * (le check renvoyait toujours `false` en prod → aucun logo affiché).
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
    label: 'Organisation Mondiale de la Santé',
  },
];

export function LogosHeader() {
  return (
    <div className="border-b bg-white">
      <div className="container flex flex-wrap items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-6">
          {LOGOS.map((l) => (
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
          ))}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div className="font-medium text-primary">SPAD 2026 · Phase pilote</div>
          <div>Système de Production et d’Analyse des Données</div>
        </div>
      </div>
    </div>
  );
}
