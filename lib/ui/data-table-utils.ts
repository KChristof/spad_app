/**
 * Fonctions pures pour DataTable — filtrage/tri isolés pour être testables.
 * Aucune dépendance React ici.
 */

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  key: string | null;
  direction: SortDirection;
}

/** Normalise pour recherche insensible aux accents + à la casse. */
export function normalize(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Cycle asc → desc → null → asc (tri toggle). */
export function nextSort(current: SortState, key: string): SortState {
  if (current.key !== key) return { key, direction: 'asc' };
  if (current.direction === 'asc') return { key, direction: 'desc' };
  if (current.direction === 'desc') return { key: null, direction: null };
  return { key, direction: 'asc' };
}

/** Comparateur naturel : nombres avant, sinon localeCompare. */
export function compareValues(a: unknown, b: unknown): number {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'fr', { numeric: true, sensitivity: 'base' });
}

/**
 * Filtre les lignes selon:
 *  - recherche texte (portée sur tous les champs `searchableFields`)
 *  - filtres à facettes { key: Set<valeur> } — une ligne est retenue si, pour
 *    chaque facette non vide, la valeur ligne[key] appartient au Set.
 *    (Si la ligne peut avoir plusieurs valeurs, passer `multiValueFields` pour
 *     étendre la comparaison à un Array<string>.)
 */
export function filterRows<T extends Record<string, unknown>>(
  rows: T[],
  opts: {
    search?: string;
    searchableFields?: string[];
    filters?: Record<string, Set<string>>;
  },
): T[] {
  const q = normalize(opts.search ?? '');
  const filters = opts.filters ?? {};
  return rows.filter((row) => {
    // Recherche texte
    if (q) {
      const fields = opts.searchableFields ?? Object.keys(row);
      const hit = fields.some((f) => normalize(row[f]).includes(q));
      if (!hit) return false;
    }
    // Facettes
    for (const [key, set] of Object.entries(filters)) {
      if (set.size === 0) continue;
      const v = row[key];
      if (Array.isArray(v)) {
        if (!v.some((x) => set.has(String(x)))) return false;
      } else if (!set.has(String(v))) {
        return false;
      }
    }
    return true;
  });
}

export function sortRows<T extends Record<string, unknown>>(
  rows: T[],
  state: SortState,
  sortAccessors?: Record<string, (row: T) => unknown>,
): T[] {
  if (!state.key || !state.direction) return rows;
  const key = state.key;
  const dir = state.direction === 'asc' ? 1 : -1;
  const accessor = sortAccessors?.[key] ?? ((r: T) => r[key]);
  return [...rows].sort((a, b) => {
    const va = accessor(a);
    const vb = accessor(b);
    // Les null/undefined restent TOUJOURS en fin, quelle que soit la direction.
    const aEmpty = va === null || va === undefined;
    const bEmpty = vb === null || vb === undefined;
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    return dir * compareValues(va, vb);
  });
}
