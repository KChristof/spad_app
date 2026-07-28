import Link from 'next/link';
import { redirect } from 'next/navigation';
import { estAuthentifie } from '@/lib/auth/session';
import { LogoutButton } from './logout-button';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!(await estAuthentifie())) redirect('/login');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card">
        <div className="container flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold text-primary">
              SPAD · Dashboard
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Vue nationale</Link>
              <Link href="/regions" className="hover:text-foreground">Régions</Link>
              <Link href="/districts" className="hover:text-foreground">Districts</Link>
              <Link href="/enqueteurs" className="hover:text-foreground">Enquêteurs</Link>
              <Link href="/superviseurs" className="hover:text-foreground">Superviseurs</Link>
              <Link href="/anomalies" className="hover:text-foreground">Anomalies</Link>
              <Link href="/export" className="hover:text-foreground">Export</Link>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="container flex-1 py-6">{children}</main>
      <footer className="border-t bg-card">
        <div className="container py-3 text-xs text-muted-foreground">
          Direction de l&rsquo;Information Sanitaire — Ministère de la Santé de Côte d&rsquo;Ivoire · SPAD V1
        </div>
      </footer>
    </div>
  );
}
