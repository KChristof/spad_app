import Link from 'next/link';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface Alerte {
  texte: string;
  href?: string;
  severite?: 'info' | 'attention' | 'critique';
}

export function PanneauAlertes({ alertes }: { alertes: Alerte[] }) {
  if (alertes.length === 0) {
    return (
      <Card className="border-statut-plein/30 bg-statut-plein/5">
        <CardContent className="py-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-statut-plein" />
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

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
        <AlertCircle className="h-4 w-4 text-statut-partiel" />
        <CardTitle className="text-base">Alertes ({alertes.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        {alertes.map((a, i) => (
          <div key={i} className="flex items-start gap-2">
            <span
              className={
                a.severite === 'critique'
                  ? 'mt-1 h-1.5 w-1.5 rounded-full bg-statut-zero'
                  : 'mt-1 h-1.5 w-1.5 rounded-full bg-statut-partiel'
              }
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
