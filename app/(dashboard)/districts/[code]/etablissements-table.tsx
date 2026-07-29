'use client';

import Link from 'next/link';
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table';
import { StatutBadge, BadgeNonDeploye } from '@/components/completude/statut-badge';
import type { FormulaireId } from '@/lib/referentiel/types';
import type { StatutCompletude } from '@/lib/completude/types';

export interface EtabDistrictRow extends Record<string, unknown> {
  code: string;
  codeId: string;
  libelle: string;
  type: string;
  enqueteurCode: string;
  formulaires: Record<FormulaireId, { deploye: boolean; taux: number | null; statut: StatutCompletude } | undefined>;
  statutGlobal: StatutCompletude;
}

const FORMS_AFFICHES: FormulaireId[] = ['F5', 'F6', 'F7', 'F8', 'F02'];
const FORM_LABELS: Record<FormulaireId, string> = {
  F5: 'Tabac Femmes',
  F6: 'Tabac Perso.',
  F7: 'Vacc. Ménages',
  F8: 'Vacc. Étab.',
  F01: 'RDM District',
  F02: 'RDM Étab.',
  F07: 'RDM Grille',
};

export function EtablissementsTable({
  rows,
  typeOptions,
}: {
  rows: EtabDistrictRow[];
  typeOptions: string[];
}) {
  const columns: DataTableColumn<EtabDistrictRow>[] = [
    {
      key: 'libelle',
      header: 'Établissement',
      sortable: true,
      sticky: true,
      render: (r) => (
        <div>
          <Link href={`/etablissements/${encodeURIComponent(r.code)}`} className="text-sm text-primary hover:underline">
            {r.libelle}
          </Link>
          <div className="text-xs text-muted-foreground font-mono">{r.codeId}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      className: 'text-xs',
      render: (r) => r.type,
    },
    {
      key: 'enqueteurCode',
      header: 'Enquêteur',
      sortable: true,
      className: 'text-xs text-muted-foreground font-mono',
      render: (r) => r.enqueteurCode,
    },
    ...FORMS_AFFICHES.map((fid) => ({
      key: fid,
      header: FORM_LABELS[fid],
      headerClassName: 'text-center whitespace-nowrap',
      className: 'text-center',
      sortable: true,
      sortValue: (r: EtabDistrictRow) => r.formulaires[fid]?.taux ?? null,
      render: (r: EtabDistrictRow) => {
        const f = r.formulaires[fid];
        if (!f || !f.deploye) return <BadgeNonDeploye />;
        return <StatutBadge statut={f.statut} taux={f.taux} compact />;
      },
    })),
  ];

  const filters: DataTableFilter[] = [
    {
      key: 'type',
      label: 'Type',
      options: typeOptions.map((t) => ({ value: t, label: t })),
    },
    {
      key: 'statutGlobal',
      label: 'Statut',
      options: [
        { value: 'zero', label: '0 %' },
        { value: 'partiel', label: 'En cours' },
        { value: 'plein', label: 'Cible atteinte' },
        { value: 'exces', label: 'À vérifier' },
        { value: 'nonConcerne', label: 'Non concerné' },
      ],
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      filters={filters}
      searchableFields={['libelle', 'codeId', 'code', 'type', 'enqueteurCode']}
      searchPlaceholder="Rechercher un établissement…"
      itemLabel="établissements"
      urlKey="etab"
      defaultSort={{ key: 'codeId', direction: 'asc' }}
    />
  );
}
