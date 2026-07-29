import { describe, it, expect } from 'vitest';
import { filterRows, sortRows, nextSort, normalize, compareValues } from './data-table-utils';

const rows = [
  { code: 'D01ENQ1', nom: 'HIEN SIÉ ARISTIDE', district: 'ABENGOUROU', taux: 0.8 },
  { code: 'D01ENQ2', nom: 'KOUAME GERARD', district: 'ABENGOUROU', taux: 0.5 },
  { code: 'D02ENQ1', nom: 'ABE ASSEMIAN', district: 'AGBOVILLE', taux: 0 },
  { code: 'D03ENQ1', nom: 'KILANKO SÉPHORA', district: 'YOPOUGON_OUEST_SONGON', taux: null },
];

describe('normalize', () => {
  it('supprime les accents et met en minuscules', () => {
    expect(normalize('HIEN SIÉ ARISTIDE')).toBe('hien sie aristide');
    expect(normalize('ÀÉÎÖÙ')).toBe('aeiou');
  });
  it('accepte les types non-string', () => {
    expect(normalize(42)).toBe('42');
    expect(normalize(null)).toBe('');
    expect(normalize(undefined)).toBe('');
  });
});

describe('nextSort', () => {
  it('cycle asc → desc → null quand on reclique la même colonne', () => {
    let s = { key: null as string | null, direction: null as 'asc' | 'desc' | null };
    s = nextSort(s, 'nom');
    expect(s).toEqual({ key: 'nom', direction: 'asc' });
    s = nextSort(s, 'nom');
    expect(s).toEqual({ key: 'nom', direction: 'desc' });
    s = nextSort(s, 'nom');
    expect(s).toEqual({ key: null, direction: null });
  });
  it("repart sur asc quand on clique une autre colonne", () => {
    const s = nextSort({ key: 'nom', direction: 'desc' }, 'district');
    expect(s).toEqual({ key: 'district', direction: 'asc' });
  });
});

describe('compareValues', () => {
  it('compare numériquement les nombres', () => {
    expect(compareValues(2, 10)).toBeLessThan(0); // pas alphabétique
    expect(compareValues(10, 2)).toBeGreaterThan(0);
  });
  it('null passe à la fin', () => {
    expect(compareValues(null, 5)).toBeGreaterThan(0);
    expect(compareValues(5, null)).toBeLessThan(0);
  });
  it('accents ignorés dans la comparaison alphabétique', () => {
    expect(compareValues('Éléonore', 'Elena')).toBeGreaterThan(0);
    expect(compareValues('éléonore', 'zoe')).toBeLessThan(0);
  });
});

describe('filterRows', () => {
  it('recherche insensible aux accents', () => {
    const r = filterRows(rows, { search: 'hien sie', searchableFields: ['nom'] });
    expect(r).toHaveLength(1);
    expect(r[0].code).toBe('D01ENQ1');
  });
  it('recherche sur plusieurs champs', () => {
    const r = filterRows(rows, { search: 'agboville', searchableFields: ['nom', 'district'] });
    expect(r).toHaveLength(1);
    expect(r[0].code).toBe('D02ENQ1');
  });
  it('renvoie tout quand la recherche est vide', () => {
    const r = filterRows(rows, { search: '', searchableFields: ['nom'] });
    expect(r).toHaveLength(rows.length);
  });
  it('facette multi-valeurs (OR à l’intérieur, AND entre facettes)', () => {
    const r = filterRows(rows, {
      filters: { district: new Set(['ABENGOUROU', 'AGBOVILLE']) },
    });
    expect(r.map((x) => x.code)).toEqual(['D01ENQ1', 'D01ENQ2', 'D02ENQ1']);
  });
  it('facette vide n’applique pas de restriction', () => {
    const r = filterRows(rows, { filters: { district: new Set() } });
    expect(r).toHaveLength(rows.length);
  });
});

describe('sortRows', () => {
  it('trie numériquement, null passe en fin', () => {
    const r = sortRows(rows, { key: 'taux', direction: 'asc' });
    expect(r.map((x) => x.taux)).toEqual([0, 0.5, 0.8, null]);
  });
  it('tri descendant', () => {
    const r = sortRows(rows, { key: 'taux', direction: 'desc' });
    expect(r.map((x) => x.taux)).toEqual([0.8, 0.5, 0, null]);
  });
  it('renvoie l’ordre initial si direction=null', () => {
    const r = sortRows(rows, { key: 'nom', direction: null });
    expect(r).toEqual(rows);
  });
  it('utilise un accessor personnalisé', () => {
    const r = sortRows(rows, { key: 'nom', direction: 'asc' }, { nom: (x) => normalize(x.nom) });
    // ABE < HIEN < KILANKO < KOUAME (insensible aux accents)
    expect(r.map((x) => x.code)).toEqual(['D02ENQ1', 'D01ENQ1', 'D03ENQ1', 'D01ENQ2']);
  });
});
