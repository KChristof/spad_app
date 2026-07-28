'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export function RafraichirBouton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function rafraichir() {
    setErr(null);
    const res = await fetch('/api/rafraichir', { method: 'POST' });
    if (!res.ok) {
      setErr('Échec du rafraîchissement.');
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={rafraichir}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
      >
        <RefreshCw className={pending ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
        {pending ? 'Rafraîchissement…' : 'Rafraîchir maintenant'}
      </button>
      {err && <span className="text-xs text-statut-zero">{err}</span>}
    </div>
  );
}
