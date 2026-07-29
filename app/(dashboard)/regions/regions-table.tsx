'use client';

import Link from 'next/link';
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table';
import { StatutBadge, BadgeNonDeploye } from '@/components/completude/statut-badge';
import type { FormulaireId } from '@/lib/referentiel/types';
import type { StatutCompletude } from '@/lib/completude/types';

export interface RegionRow extends Record<string, unknown> {
  regionCode: string;
  regionLibelle: string;
  nbDistricts: number;
  districtsLabels: string[];
  formulaires: Record<FormulaireId, { deploye: boolean; taux: number | null; statut: StatutCompletude } | undefined>;
  statutGlobal: StatutCompletude;
}

const FORMS_AFFICHES: FormulaireId[] = ['F5', 'F6', 'F7', 'F8', 'F01', 'F02'];
const FORM_LABELS: Record<FormulaireId, string> = {
  F5: 'Tabac F.',
  F6: 'Tabac P.',
  F7: 'Vacc. Mén.',
  F8: 'Vacc. Étab.',
  F01: 'RDM Dist.',
  F02: 'RDM Étab.',
  F07: 'RDM Grille',
};

export function RegionsTable({ rows }: { rows: RegionRow[] }) {
  const columns: DataTableColumn<RegionRow>[] = [
    {
      key: 'regionLibelle',
      header: 'Région',
      sticky: true,
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-sm">{r.regionLibelle}</div>
          <div className="text-xs text-muted-foreground">
            {r.districtsLabels.join(' · ')}
          </div>
        </div>
      ),
    },
    {
      key: 'nbDistricts',
      header: 'Districts',
      headerClassName: 'text-right',
      className: 'num-cell text-sm',
      sortable: true,
      render: (r) => r.nbDistricts,
    },
    ...FORMS_AFFICHES.map((fid) => ({
      key: fid,
      header: FORM_LABELS[fid],
      headerClassName: 'text-center whitespace-nowrap',
      className: 'text-center',
      sortable: true,
      sortValue: (r: RegionRow) => r.formulaires[fid]?.taux ?? null,
      render: (r: RegionRow) => {
        const f = r.formulaires[fid];
        if (!f || !f.deploye) return <BadgeNonDeploye />;
        return <StatutBadge statut={f.statut} taux={f.taux} compact />;
      },
    })),
  ];

  const filters: DataTableFilter[] = [
    {
      key: 'statutGlobal',
      label: 'Statut',
      options: [
        { value: 'zero', label: '0 %' },
        { value: 'partiel', label: 'En cours' },
        { value: 'plein', label: 'Cible atteinte' },
        { value: 'exces', label: 'À vérifier' },
      ],
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      filters={filters}
      searchableFields={['regionLibelle']}
      searchPlaceholder="Rechercher une région…"
      itemLabel="régions"
      urlKey="reg"
      defaultSort={{ key: 'regionLibelle', direction: 'asc' }}
    />
  );
}

export const REGIONS_TABLE_FORMS = FORMS_AFFICHES;
