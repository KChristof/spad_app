import Link from 'next/link';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface Alerte {
  texte: string;
  href?: string;
  severite?: 'info' | 'attention' | 'critique';
}

function couleurPuce(s?: Alerte['severite']) {
  switch (s) {
    case 'critique':
      return 'bg-statut-zero';
    case 'info':
      return 'bg-primary';
    case 'attention':
    default:
      return 'bg-statut-partiel';
  }
}

export function PanneauAlertes({ alertes }: { alertes: Alerte[] }) {
  if (alertes.length === 0) {
    return (
      <Card className="border-statut-plein/30 bg-statut-plein/5">
        <CardContent className="py-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-statut-plein shrink-0" />
          <div>
            <div className="text-sm font-medium text-foreground">Aucune alerte — RAS.</div>
            <div className="text-xs text-muted-foreground">
              Aucune anomalie détectée sur la collecte au moment de cette lecture.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nbCritique = alertes.filter((a) => a.severite === 'critique').length;
  const nbInfo = alertes.filter((a) => a.severite === 'info').length;
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
        {nbCritique > 0 ? (
          <AlertCircle className="h-4 w-4 text-statut-zero" />
        ) : nbInfo === alertes.length ? (
          <Info className="h-4 w-4 text-primary" />
        ) : (
          <AlertCircle className="h-4 w-4 text-statut-partiel" />
        )}
        <CardTitle className="text-base">Signalements ({alertes.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        {alertes.map((a, i) => (
          <div key={i} className="flex items-start gap-2">
            <span
              aria-hidden
              className={cn('mt-1 h-1.5 w-1.5 rounded-full shrink-0', couleurPuce(a.severite))}
            />
            {a.href ? (
              <Link href={a.href} className="text-primary hover:underline">{a.texte}</Link>
            ) : (
              <span>{a.texte}</span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
