'use client';

import Link from 'next/link';
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table';
import { StatutBadge, BadgeNonDeploye } from '@/components/completude/statut-badge';
import type { FormulaireId } from '@/lib/referentiel/types';
import type { StatutCompletude } from '@/lib/completude/types';

export interface EnqueteurRow extends Record<string, unknown> {
  code: string;
  nom: string;
  districtCode: string;
  districtLibelle: string;
  telephone: string;
  formulaires: Record<FormulaireId, { deploye: boolean; taux: number | null; statut: StatutCompletude; nbRecu: number; nbAttendu: number } | undefined>;
  // Statut résumé (le pire des 4) — utilisé pour la facette
  statutGlobal: StatutCompletude;
}

const FORMS: FormulaireId[] = ['F5', 'F6', 'F7', 'F8'];

const STATUT_LABELS: Record<string, string> = {
  zero: '0 %',
  partiel: 'En cours',
  plein: 'Cible atteinte',
  exces: 'À vérifier',
  neutre: 'Pas encore déployé',
};

export function EnqueteursTable({
  rows,
  districtOptions,
}: {
  rows: EnqueteurRow[];
  districtOptions: { code: string; libelle: string }[];
}) {
  const columns: DataTableColumn<EnqueteurRow>[] = [
    {
      key: 'nom',
      header: 'Enquêteur',
      sortable: true,
      sticky: true,
      sortValue: (r) => r.nom.toLowerCase(),
      render: (r) => (
        <div>
          <Link href={`/enqueteurs/${r.code}`} className="text-sm text-primary hover:underline font-medium">
            {r.nom}
          </Link>
          <div className="text-xs text-muted-foreground font-mono">{r.code}</div>
        </div>
      ),
    },
    {
      key: 'districtLibelle',
      header: 'District',
      sortable: true,
      render: (r) => <span className="text-xs text-muted-foreground">{r.districtLibelle}</span>,
    },
    {
      key: 'telephone',
      header: 'Téléphone',
      render: (r) => <span className="text-xs font-mono">{r.telephone || '—'}</span>,
    },
    ...FORMS.map((fid) => ({
      key: fid,
      header: fid === 'F5' ? 'Tabac — Femmes' : fid === 'F6' ? 'Tabac — Perso.' : fid === 'F7' ? 'Vacc. — Ménages' : 'Vacc. — Étab.',
      headerClassName: 'text-center whitespace-nowrap',
      className: 'text-center',
      sortable: true,
      sortValue: (r: EnqueteurRow) => r.formulaires[fid]?.taux ?? null,
      render: (r: EnqueteurRow) => {
        const f = r.formulaires[fid];
        if (!f || !f.deploye) return <BadgeNonDeploye />;
        return <StatutBadge statut={f.statut} taux={f.taux} compact />;
      },
    })),
  ];

  const filters: DataTableFilter[] = [
    {
      key: 'districtCode',
      label: 'District',
      options: districtOptions.map((d) => ({ value: d.code, label: d.libelle })),
    },
    {
      key: 'statutGlobal',
      label: 'Statut',
      options: [
        { value: 'zero', label: '0 %' },
        { value: 'partiel', label: 'En cours' },
        { value: 'plein', label: 'Cible atteinte' },
        { value: 'exces', label: 'À vérifier' },
        { value: 'neutre', label: 'Pas encore déployé' },
      ],
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      filters={filters}
      searchableFields={['nom', 'code', 'districtLibelle', 'telephone']}
      searchPlaceholder="Rechercher un enquêteur, un district, un téléphone…"
      itemLabel="enquêteurs"
      urlKey="enq"
      defaultSort={{ key: 'nom', direction: 'asc' }}
    />
  );
}
