'use client';

import Link from 'next/link';
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table';
import { StatutBadge, BadgeNonDeploye } from './statut-badge';
import { FORMULAIRES, isDeploye } from '@/lib/kobo/formulaires';
import type { FormulaireId } from '@/lib/referentiel/types';
import type { StatutCompletude } from '@/lib/completude/types';

/**
 * Grille croisée district × formulaire. Client Component (filtres/tri via
 * DataTable). Les données sont préparées côté serveur puis passées en props.
 */

export interface DistrictGridRow extends Record<string, unknown> {
  districtCode: string;
  districtLibelle: string;
  districtCodeId: string;
  regionCode: string;
  regionLibelle: string;
  formulaires: Record<
    FormulaireId,
    | { deploye: boolean; taux: number | null; statut: StatutCompletude; nbRecu: number; nbAttendu: number | null }
    | undefined
  >;
  // F07 : cible plancher
  f07NbRecu: number;
  f07Cible: number;
  f07Statut: StatutCompletude;
  statutGlobal: StatutCompletude;
}

export function GrilleDistricts({
  rows,
  regionOptions,
}: {
  rows: DistrictGridRow[];
  regionOptions?: { code: string; libelle: string }[];
}) {
  const columns: DataTableColumn<DistrictGridRow>[] = [
    {
      key: 'districtLibelle',
      header: 'District',
      sortable: true,
      sticky: true,
      render: (r) => (
        <Link href={`/districts/${r.districtCode}`} className="text-sm font-medium text-primary hover:underline">
          {r.districtLibelle}{' '}
          <span className="text-muted-foreground text-xs font-normal">({r.districtCodeId})</span>
        </Link>
      ),
    },
    ...FORMULAIRES.map((f) => {
      if (f.id === 'F07') {
        return {
          key: f.id,
          header: f.libelleCourt,
          headerClassName: 'text-center whitespace-nowrap',
          className: 'text-center',
          sortable: true,
          sortValue: (r: DistrictGridRow) => (r.f07Cible > 0 ? r.f07NbRecu / r.f07Cible : null),
          render: (r: DistrictGridRow) => {
            if (!isDeploye('F07')) return <BadgeNonDeploye />;
            if (r.f07Cible === 0) return <span className="text-muted-foreground text-xs">—</span>;
            return (
              <div>
                <StatutBadge statut={r.f07Statut} compact />
                <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                  {r.f07NbRecu} / {r.f07Cible} min.
                </div>
              </div>
            );
          },
        };
      }
      return {
        key: f.id,
        header: f.libelleCourt,
        headerClassName: 'text-center whitespace-nowrap',
        className: 'text-center',
        sortable: true,
        sortValue: (r: DistrictGridRow) => r.formulaires[f.id]?.taux ?? null,
        render: (r: DistrictGridRow) => {
          const ff = r.formulaires[f.id];
          if (!ff || !ff.deploye) return <BadgeNonDeploye />;
          return <StatutBadge statut={ff.statut} taux={ff.taux} compact />;
        },
      };
    }),
  ];

  const filters: DataTableFilter[] = [];
  if (regionOptions && regionOptions.length > 0) {
    filters.push({
      key: 'regionCode',
      label: 'Région',
      options: regionOptions.map((r) => ({ value: r.code, label: r.libelle })),
    });
  }
  filters.push({
    key: 'statutGlobal',
    label: 'Statut',
    options: [
      { value: 'zero', label: '0 %' },
      { value: 'partiel', label: 'En cours' },
      { value: 'plein', label: 'Cible atteinte' },
      { value: 'exces', label: 'À vérifier' },
    ],
  });

  return (
    <DataTable
      rows={rows}
      columns={columns}
      filters={filters}
      searchableFields={['districtLibelle', 'districtCodeId', 'regionLibelle']}
      searchPlaceholder="Rechercher un district…"
      itemLabel="districts"
      urlKey="dist"
      defaultSort={{ key: 'districtLibelle', direction: 'asc' }}
    />
  );
}
