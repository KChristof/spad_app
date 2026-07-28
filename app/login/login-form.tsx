'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motDePasse }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErreur(body.erreur ?? 'Connexion impossible.');
      return;
    }
    startTransition(() => {
      router.replace(redirectTo);
      router.refresh();
    });
  }

  return (
    <form onSubmit={soumettre} className="space-y-4">
      <label htmlFor="motDePasse" className="block text-sm font-medium">
        Mot de passe
      </label>
      <input
        id="motDePasse"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        value={motDePasse}
        onChange={(e) => setMotDePasse(e.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {erreur && <p className="text-sm text-statut-zero">{erreur}</p>}
      <button
        type="submit"
        disabled={pending || motDePasse.length === 0}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? 'Connexion…' : 'Se connecter'}
      </button>
      <p className="text-xs text-muted-foreground">
        Ce dashboard est réservé à un usage interne DIS. En cas de problème d&rsquo;accès,
        contactez l&rsquo;administrateur.
      </p>
    </form>
  );
}
