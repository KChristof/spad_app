import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SPAD — Dashboard de complétude',
  description:
    "Dashboard de pilotage de la complétude de collecte de données terrain SPAD — DIS, Ministère de la Santé de Côte d'Ivoire.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
