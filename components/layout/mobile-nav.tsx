'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/', label: 'Vue nationale' },
  { href: '/regions', label: 'Régions' },
  { href: '/districts', label: 'Districts' },
  { href: '/enqueteurs', label: 'Enquêteurs' },
  { href: '/superviseurs', label: 'Superviseurs' },
  { href: '/graphiques', label: 'Graphiques' },
  { href: '/anomalies', label: 'Anomalies' },
  { href: '/export', label: 'Export' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        className="inline-flex items-center justify-center h-10 w-10 rounded-md border hover:bg-muted"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <div
          className={cn(
            'fixed inset-x-0 top-[calc(var(--logos-header-h,120px))] z-40 border-b bg-card shadow-md',
            'motion-safe:animate-[fadeInUp_.15s_ease-out_both]',
          )}
        >
          <nav className="container flex flex-col py-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-3 px-2 text-sm text-foreground hover:bg-muted rounded"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
