'use client';

import { useMemo, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  filterRows,
  sortRows,
  nextSort,
  type SortState,
} from '@/lib/ui/data-table-utils';

/**
 * DataTable réutilisable — recherche + facettes multi-select + tri +
 * persistance query params (URL partageable / survit au refresh).
 *
 * Design : institutionnel sobre. Tableau sticky-header, colonne 1 figée
 * (via className `sticky-col`). Reste compatible imprimable.
 */

export interface DataTableColumn<T> {
  /** Clé unique — utilisée pour tri et query params. */
  key: string;
  /** En-tête affiché. */
  header: ReactNode;
  /** Contenu de cellule (JSX). */
  render: (row: T) => ReactNode;
  /** Valeur utilisée pour le tri (par défaut : row[key] via cast). */
  sortValue?: (row: T) => unknown;
  /** Active le clic-tri sur cette colonne. */
  sortable?: boolean;
  /** Alignement/props supplémentaires côté cellule. */
  className?: string;
  headerClassName?: string;
  /** Si true, la colonne devient sticky à gauche (colonne 1 typiquement). */
  sticky?: boolean;
}

export interface DataTableFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  /** Valeur multi-valeurs (ex. plusieurs formulaires par ligne). Défaut : false. */
  multiValueRow?: boolean;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  rows: T[];
  columns: DataTableColumn<T>[];
  /** Champs textuels pour la recherche globale. */
  searchableFields?: string[];
  /** Facettes affichées au-dessus du tableau. */
  filters?: DataTableFilter[];
  /** Placeholder de l'input recherche. */
  searchPlaceholder?: string;
  /** Libellé unité pour le compteur (« enquêteurs », « lignes »). */
  itemLabel?: string;
  /** Namespace pour les query params (utile si plusieurs tables sur la page). */
  urlKey?: string;
  /** Tri initial. */
  defaultSort?: SortState;
  /** Rendu quand aucune ligne (défaut : « Aucun résultat pour ces filtres »). */
  emptyMessage?: ReactNode;
  /** Rendu additionnel de ligne (ex. row-level classes). */
  rowClassName?: (row: T) => string | undefined;
  className?: string;
}

const DEBOUNCE_MS = 200;

export function DataTable<T extends Record<string, unknown>>({
  rows,
  columns,
  searchableFields,
  filters = [],
  searchPlaceholder = 'Rechercher…',
  itemLabel = 'lignes',
  urlKey = 'dt',
  defaultSort = { key: null, direction: null },
  emptyMessage,
  rowClassName,
  className,
}: DataTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Query params namespacés : ex. urlKey=enq → enq_q, enq_sort, enq_dir, enq_f_district
  const p = (name: string) => `${urlKey}_${name}`;

  const initialSearch = searchParams.get(p('q')) ?? '';
  const initialSortKey = searchParams.get(p('sort'));
  const initialSortDir = searchParams.get(p('dir')) as SortState['direction'];

  const [search, setSearch] = useState(initialSearch);
  const [debounced, setDebounced] = useState(initialSearch);
  const [sort, setSort] = useState<SortState>(
    initialSortKey && (initialSortDir === 'asc' || initialSortDir === 'desc')
      ? { key: initialSortKey, direction: initialSortDir }
      : defaultSort,
  );
  const [filtersState, setFiltersState] = useState<Record<string, Set<string>>>(() => {
    const out: Record<string, Set<string>> = {};
    for (const f of filters) {
      const v = searchParams.get(p(`f_${f.key}`));
      out[f.key] = v ? new Set(v.split('|').filter(Boolean)) : new Set();
    }
    return out;
  });

  // Debounce recherche
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  // Sync vers URL (replace, pas de nouvelle entrée d'historique)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const setOrDelete = (k: string, v: string | null) => {
      if (v && v.length > 0) params.set(k, v);
      else params.delete(k);
    };
    setOrDelete(p('q'), debounced);
    setOrDelete(p('sort'), sort.key ?? '');
    setOrDelete(p('dir'), sort.direction ?? '');
    for (const f of filters) {
      const s = filtersState[f.key];
      setOrDelete(p(`f_${f.key}`), s && s.size > 0 ? Array.from(s).join('|') : '');
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, sort, filtersState]);

  // Sort accessors
  const sortAccessors = useMemo(() => {
    const acc: Record<string, (row: T) => unknown> = {};
    for (const c of columns) if (c.sortValue) acc[c.key] = c.sortValue;
    return acc;
  }, [columns]);

  const filtered = useMemo(
    () => filterRows(rows, { search: debounced, searchableFields, filters: filtersState }),
    [rows, debounced, searchableFields, filtersState],
  );
  const finalRows = useMemo(() => sortRows(filtered, sort, sortAccessors), [filtered, sort, sortAccessors]);

  const nbActiveFilters = Object.values(filtersState).reduce((n, s) => n + (s.size > 0 ? 1 : 0), 0);
  const isFiltered = debounced.length > 0 || nbActiveFilters > 0 || sort.direction !== null;

  const reset = useCallback(() => {
    setSearch('');
    setDebounced('');
    setSort(defaultSort);
    const cleared: Record<string, Set<string>> = {};
    for (const f of filters) cleared[f.key] = new Set();
    setFiltersState(cleared);
  }, [defaultSort, filters]);

  const toggleFilter = (key: string, val: string) => {
    setFiltersState((s) => {
      const cur = new Set(s[key] ?? []);
      if (cur.has(val)) cur.delete(val);
      else cur.add(val);
      return { ...s, [key]: cur };
    });
  };
  const setAllFilter = (key: string, values: string[]) => {
    setFiltersState((s) => ({ ...s, [key]: new Set(values) }));
  };
  const clearFilter = (key: string) => {
    setFiltersState((s) => ({ ...s, [key]: new Set() }));
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Barre outils */}
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="flex-1 min-w-0">
          <div className="relative max-w-md">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-10 rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              aria-label="Recherche"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground tabular-nums">
            {finalRows.length} / {rows.length} {itemLabel}
          </span>
          {isFiltered && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 h-8 hover:bg-muted"
            >
              <X className="h-3 w-3" />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Facettes */}
      {filters.length > 0 && (
        <div className="space-y-2">
          {filters.map((f) => {
            const current = filtersState[f.key] ?? new Set();
            return (
              <div key={f.key} className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs uppercase tracking-wide text-muted-foreground min-w-[80px]">
                  {f.label}
                </span>
                <button
                  type="button"
                  onClick={() => setAllFilter(f.key, f.options.map((o) => o.value))}
                  className="rounded-md border bg-muted/40 px-2 h-7 text-xs hover:bg-muted"
                >
                  Tout
                </button>
                <button
                  type="button"
                  onClick={() => clearFilter(f.key)}
                  className="rounded-md border bg-muted/40 px-2 h-7 text-xs hover:bg-muted"
                >
                  Aucun
                </button>
                {f.options.map((opt) => {
                  const actif = current.has(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleFilter(f.key, opt.value)}
                      aria-pressed={actif}
                      className={cn(
                        'rounded-md border px-2 h-7 text-xs transition-colors',
                        actif
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'bg-muted/40 text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Tableau */}
      <div className="w-full overflow-x-auto rounded-md border">
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-muted/60 sticky top-0 z-10 [&_tr]:border-b">
            <tr>
              {columns.map((c) => {
                const isSorted = sort.key === c.key;
                const Chevron = !isSorted
                  ? ArrowUpDown
                  : sort.direction === 'asc'
                    ? ArrowUp
                    : ArrowDown;
                return (
                  <th
                    key={c.key}
                    className={cn(
                      'h-9 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground bg-muted/60',
                      c.sticky && 'sticky left-0 z-20 shadow-[1px_0_0_0_hsl(var(--border))]',
                      c.headerClassName,
                    )}
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={() => setSort(nextSort(sort, c.key))}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {c.header}
                        <Chevron className={cn('h-3 w-3 opacity-70', isSorted && 'opacity-100 text-foreground')} />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {finalRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage ?? 'Aucun résultat pour ces filtres.'}
                </td>
              </tr>
            ) : (
              finalRows.map((row, i) => {
                // Cellules sticky : fond opaque suivant zébrure (impair = muted/10, pair = card)
                const stickyBg = i % 2 === 0 ? 'bg-card' : 'bg-muted/10';
                return (
                  <tr
                    key={i}
                    className={cn(
                      'border-b transition-colors hover:bg-muted/40 odd:bg-muted/10',
                      rowClassName?.(row),
                    )}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          'px-3 py-2 align-middle',
                          c.sticky && `sticky left-0 z-10 ${stickyBg} shadow-[1px_0_0_0_hsl(var(--border))]`,
                          c.className,
                        )}
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
