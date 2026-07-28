import { redirect } from 'next/navigation';
import { estAuthentifie } from '@/lib/auth/session';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  if (await estAuthentifie()) redirect('/');
  const params = await searchParams;
  const target = typeof params.redirect === 'string' ? params.redirect : '/';

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-primary">SPAD — Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Direction de l&rsquo;Information Sanitaire — Ministère de la Santé de Côte d&rsquo;Ivoire
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <LoginForm redirectTo={target} />
        </div>
      </div>
    </main>
  );
}
