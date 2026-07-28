import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default function ExportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Export</h1>
        <p className="text-sm text-muted-foreground">
          Export de l&rsquo;état courant (établissement × formulaire) pour diffusion hors-ligne aux équipes terrain.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href="/api/export?format=csv"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Télécharger CSV
          </a>
          <a
            href="/api/export?format=xlsx"
            className="ml-3 inline-flex items-center rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Télécharger XLSX
          </a>
          <p className="text-xs text-muted-foreground pt-3">
            Colonnes : région · district · établissement · type · enquêteur · formulaire ·
            cible · reçu · taux (%) · statut · anomalies.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
