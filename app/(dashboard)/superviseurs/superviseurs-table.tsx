'use client';

import Link from 'next/link';
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table';
import { StatutBadge, BadgeNonDeploye } from '@/components/completude/statut-badge';
import type { StatutCompletude } from '@/lib/completude/types';

export interface SuperviseurRow extends Record<string, unknown> {
  code: string;
  nom: string;
  districtCode: string;
  districtLibelle: string;
  telephone: string;
  f01Deploye: boolean;
  f01Statut: StatutCompletude;
  f01Taux: number | null;
  f02Deploye: boolean;
  f02Statut: StatutCompletude;
  f02Taux: number | null;
  f02NbRecu: number;
  f02NbAttendu: number;
  f07Deploye: boolean;
  f07Statut: StatutCompletude;
  f07NbRecu: number;
  f07Cible: number;
  statutGlobal: StatutCompletude;
}

export function SuperviseursTable({
  rows,
  districtOptions,
}: {
  rows: SuperviseurRow[];
  districtOptions: { code: string; libelle: string }[];
}) {
  const columns: DataTableColumn<SuperviseurRow>[] = [
    {
      key: 'nom',
      header: 'Superviseur',
      sortable: true,
      sticky: true,
      sortValue: (r) => r.nom.toLowerCase(),
      render: (r) => (
        <div>
          <div className="text-sm font-medium">{r.nom}</div>
          <div className="text-xs text-muted-foreground font-mono">{r.code}</div>
        </div>
      ),
    },
    {
      key: 'districtLibelle',
      header: 'District',
      sortable: true,
      render: (r) => (
        <Link href={`/districts/${r.districtCode}`} className="text-xs hover:text-foreground text-muted-foreground">
          {r.districtLibelle}
        </Link>
      ),
    },
    {
      key: 'telephone',
      header: 'Téléphone',
      render: (r) => <span className="text-xs font-mono">{r.telephone || '—'}</span>,
    },
    {
      key: 'f01',
      header: 'RDM — District',
      headerClassName: 'text-center whitespace-nowrap',
      className: 'text-center',
      sortable: true,
      sortValue: (r) => r.f01Taux,
      render: (r) => (!r.f01Deploye ? <BadgeNonDeploye /> : <StatutBadge statut={r.f01Statut} taux={r.f01Taux} compact />),
    },
    {
      key: 'f02',
      header: 'RDM — Étab.',
      headerClassName: 'text-center whitespace-nowrap',
      className: 'text-center',
      sortable: true,
      sortValue: (r) => r.f02Taux,
      render: (r) => {
        if (!r.f02Deploye) return <BadgeNonDeploye />;
        return (
          <div>
            <StatutBadge statut={r.f02Statut} taux={r.f02Taux} compact />
            <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              {r.f02NbRecu}/{r.f02NbAttendu} étab.
            </div>
          </div>
        );
      },
    },
    {
      key: 'f07',
      header: 'RDM — Grille',
      headerClassName: 'text-center whitespace-nowrap',
      className: 'text-center',
      sortable: true,
      sortValue: (r) => (r.f07Cible > 0 ? r.f07NbRecu / r.f07Cible : null),
      render: (r) => {
        if (!r.f07Deploye) return <BadgeNonDeploye />;
        return (
          <div>
            <StatutBadge statut={r.f07Statut} compact />
            <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              {r.f07NbRecu} / {r.f07Cible} min.
            </div>
          </div>
        );
      },
    },
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
      ],
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      filters={filters}
      searchableFields={['nom', 'code', 'districtLibelle', 'telephone']}
      searchPlaceholder="Rechercher un superviseur, un district…"
      itemLabel="superviseurs"
      urlKey="sup"
      defaultSort={{ key: 'nom', direction: 'asc' }}
    />
  );
}
