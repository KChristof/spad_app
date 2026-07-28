'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function deconnecter() {
    await fetch('/api/logout', { method: 'POST' });
    startTransition(() => {
      router.replace('/login');
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={deconnecter}
      disabled={pending}
      className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
    >
      {pending ? 'Déconnexion…' : 'Se déconnecter'}
    </button>
  );
}
