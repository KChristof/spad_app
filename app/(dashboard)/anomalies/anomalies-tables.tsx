'use client';

import Link from 'next/link';
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table';
import { StatutBadge, BadgeHorsListeRdm } from '@/components/completude/statut-badge';
import type { StatutCompletude } from '@/lib/completude/types';

// -- Tables données côté client, préparées côté serveur

export interface ZeroRow extends Record<string, unknown> {
  etablissementCode: string;
  etablissementLibelle: string;
  districtCode: string;
  districtLibelle: string;
  formulaireId: string;
  formulaireLibelle: string;
  nbAttendu: number | null;
}

export interface ExcesRow extends Record<string, unknown> {
  etablissementCode: string;
  etablissementLibelle: string;
  districtCode: string;
  districtLibelle: string;
  formulaireId: string;
  formulaireLibelle: string;
  nbRecu: number;
  nbAttendu: number | null;
  taux: number | null;
  statut: StatutCompletude;
  anomalies: string;
}

export interface HorsListeRow extends Record<string, unknown> {
  etablissementCode: string;
  etablissementLibelle: string;
  districtCode: string;
  districtLibelle: string;
  nbRecu: number;
}

export interface F07Row extends Record<string, unknown> {
  districtCode: string;
  districtLibelle: string;
  nbRecu: number;
  cibleMinimum: number;
  reste: number;
  notifF01: number;
  revusF02: number;
  statut: StatutCompletude;
}

// ---------------------------------------------------------------------------

export function TableZeros({
  rows,
  districtOptions,
  formulaireOptions,
}: {
  rows: ZeroRow[];
  districtOptions: { code: string; libelle: string }[];
  formulaireOptions: { id: string; libelle: string }[];
}) {
  const columns: DataTableColumn<ZeroRow>[] = [
    {
      key: 'etablissementLibelle',
      header: 'Établissement',
      sortable: true,
      sticky: true,
      render: (r) => (
        <Link
          href={`/etablissements/${encodeURIComponent(r.etablissementCode)}`}
          className="text-sm text-primary hover:underline"
        >
          {r.etablissementLibelle}
        </Link>
      ),
    },
    {
      key: 'districtLibelle',
      header: 'District',
      sortable: true,
      render: (r) => (
        <Link href={`/districts/${r.districtCode}`} className="text-xs text-muted-foreground hover:text-foreground">
          {r.districtLibelle}
        </Link>
      ),
    },
    {
      key: 'formulaireLibelle',
      header: 'Formulaire',
      sortable: true,
      render: (r) => <span className="text-sm">{r.formulaireLibelle}</span>,
    },
    {
      key: 'nbAttendu',
      header: 'Cible',
      headerClassName: 'text-right',
      className: 'num-cell text-xs',
      sortable: true,
      render: (r) => r.nbAttendu ?? '—',
    },
  ];
  const filters: DataTableFilter[] = [
    { key: 'districtCode', label: 'District', options: districtOptions.map((d) => ({ value: d.code, label: d.libelle })) },
    { key: 'formulaireId', label: 'Formulaire', options: formulaireOptions.map((f) => ({ value: f.id, label: f.libelle })) },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      filters={filters}
      searchableFields={['etablissementLibelle', 'districtLibelle', 'formulaireLibelle']}
      searchPlaceholder="Rechercher un établissement, un district…"
      itemLabel="lignes"
      urlKey="zeros"
      defaultSort={{ key: 'districtLibelle', direction: 'asc' }}
    />
  );
}

export function TableExces({
  rows,
  districtOptions,
  formulaireOptions,
}: {
  rows: ExcesRow[];
  districtOptions: { code: string; libelle: string }[];
  formulaireOptions: { id: string; libelle: string }[];
}) {
  const columns: DataTableColumn<ExcesRow>[] = [
    {
      key: 'etablissementLibelle',
      header: 'Établissement',
      sortable: true,
      sticky: true,
      render: (r) => (
        <Link href={`/etablissements/${encodeURIComponent(r.etablissementCode)}`} className="text-sm text-primary hover:underline">
          {r.etablissementLibelle}
        </Link>
      ),
    },
    {
      key: 'districtLibelle',
      header: 'District',
      sortable: true,
      render: (r) => <span className="text-xs text-muted-foreground">{r.districtLibelle}</span>,
    },
    {
      key: 'formulaireLibelle',
      header: 'Formulaire',
      sortable: true,
      render: (r) => <span className="text-sm">{r.formulaireLibelle}</span>,
    },
    {
      key: 'ratio',
      header: 'Reçu / Cible',
      headerClassName: 'text-right',
      className: 'num-cell text-xs',
      sortable: true,
      sortValue: (r) => r.taux,
      render: (r) => `${r.nbRecu} / ${r.nbAttendu ?? '—'}`,
    },
    {
      key: 'anomalies',
      header: 'Détail',
      className: 'text-xs text-muted-foreground',
      render: (r) => r.anomalies || '—',
    },
  ];
  const filters: DataTableFilter[] = [
    { key: 'districtCode', label: 'District', options: districtOptions.map((d) => ({ value: d.code, label: d.libelle })) },
    { key: 'formulaireId', label: 'Formulaire', options: formulaireOptions.map((f) => ({ value: f.id, label: f.libelle })) },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      filters={filters}
      searchableFields={['etablissementLibelle', 'districtLibelle', 'formulaireLibelle', 'anomalies']}
      searchPlaceholder="Rechercher un établissement, un motif…"
      itemLabel="lignes"
      urlKey="exces"
      defaultSort={{ key: 'ratio', direction: 'desc' }}
    />
  );
}

export function TableHorsListe({
  rows,
  districtOptions,
}: {
  rows: HorsListeRow[];
  districtOptions: { code: string; libelle: string }[];
}) {
  const columns: DataTableColumn<HorsListeRow>[] = [
    {
      key: 'etablissementLibelle',
      header: 'Établissement',
      sortable: true,
      sticky: true,
      render: (r) => (
        <div className="flex items-center gap-2">
          <Link href={`/etablissements/${encodeURIComponent(r.etablissementCode)}`} className="text-sm text-primary hover:underline">
            {r.etablissementLibelle}
          </Link>
          <BadgeHorsListeRdm />
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
      key: 'nbRecu',
      header: 'Fiches F02 reçues',
      headerClassName: 'text-right',
      className: 'num-cell text-sm',
      sortable: true,
      render: (r) => r.nbRecu,
    },
  ];
  const filters: DataTableFilter[] = [
    { key: 'districtCode', label: 'District', options: districtOptions.map((d) => ({ value: d.code, label: d.libelle })) },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      filters={filters}
      searchableFields={['etablissementLibelle', 'districtLibelle']}
      searchPlaceholder="Rechercher un établissement, un district…"
      itemLabel="lignes"
      urlKey="hors"
      defaultSort={{ key: 'districtLibelle', direction: 'asc' }}
      emptyMessage="Aucune fiche F02 hors liste — la liste initiale d'audit couvre toutes les fiches reçues."
    />
  );
}

export function TableF07District({
  rows,
  districtOptions,
}: {
  rows: F07Row[];
  districtOptions: { code: string; libelle: string }[];
}) {
  const columns: DataTableColumn<F07Row>[] = [
    {
      key: 'districtLibelle',
      header: 'District',
      sortable: true,
      sticky: true,
      render: (r) => (
        <Link href={`/districts/${r.districtCode}`} className="text-sm text-primary hover:underline">
          {r.districtLibelle}
        </Link>
      ),
    },
    {
      key: 'nbRecu',
      header: 'F07 reçues',
      headerClassName: 'text-right',
      className: 'num-cell text-sm',
      sortable: true,
      render: (r) => r.nbRecu,
    },
    {
      key: 'cibleMinimum',
      header: 'Cible minimum',
      headerClassName: 'text-right',
      className: 'num-cell text-sm',
      sortable: true,
      render: (r) => r.cibleMinimum,
    },
    {
      key: 'reste',
      header: 'Reste',
      headerClassName: 'text-right',
      className: 'num-cell text-sm',
      sortable: true,
      render: (r) =>
        r.reste > 0 ? (
          <span className="text-statut-partiel font-medium">{r.reste}</span>
        ) : (
          <StatutBadge statut="plein" compact />
        ),
    },
    {
      key: 'notifF01',
      header: 'Notif. F01',
      headerClassName: 'text-right',
      className: 'num-cell text-sm text-muted-foreground',
      sortable: true,
      render: (r) => r.notifF01,
    },
    {
      key: 'revusF02',
      header: 'Revus F02 cumul.',
      headerClassName: 'text-right',
      className: 'num-cell text-sm text-muted-foreground',
      sortable: true,
      render: (r) => r.revusF02,
    },
  ];
  const filters: DataTableFilter[] = [
    { key: 'districtCode', label: 'District', options: districtOptions.map((d) => ({ value: d.code, label: d.libelle })) },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      filters={filters}
      searchableFields={['districtLibelle']}
      searchPlaceholder="Rechercher un district…"
      itemLabel="districts"
      urlKey="f07"
      defaultSort={{ key: 'reste', direction: 'desc' }}
    />
  );
}
