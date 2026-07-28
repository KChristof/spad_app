import { describe, it, expect } from 'vitest';
import { getField, getFieldString } from './fields';

describe('getField', () => {
  it('trouve le champ quand il est à la racine (pas de groupe)', () => {
    expect(getField({ Etablissement_Sanitaire__X: 'X' }, 'Etablissement_Sanitaire__X')).toBe('X');
  });

  it('trouve le champ à travers un préfixe de groupe (cas F5/F7/F8)', () => {
    const submission = {
      'ENTETE_STANDARD/Etablissement_Sanitaire__X': 'CSU-DM PUBLIC de X (CSU)',
      'ENTETE_STANDARD/District_Sanitaire__X': 'ABENGOUROU',
    };
    expect(getField(submission, 'Etablissement_Sanitaire__X')).toBe('CSU-DM PUBLIC de X (CSU)');
    expect(getField(submission, 'District_Sanitaire__X')).toBe('ABENGOUROU');
  });

  it('trouve le champ à travers plusieurs niveaux de groupe (cas F6)', () => {
    const submission = {
      'ENTETE_STANDARD/Etablissement_Sanitaire__X': 'EPHR_PUBLIC_DE_X',
      'METIER_ETUDE/Section_1/Profession__X': 'medecin',
    };
    expect(getField(submission, 'Profession__X')).toBe('medecin');
    expect(getField(submission, 'Etablissement_Sanitaire__X')).toBe('EPHR_PUBLIC_DE_X');
  });

  it('renvoie undefined si le champ est absent', () => {
    expect(getField({ Foo_Bar__X: 1 }, 'Something_Else__X')).toBeUndefined();
  });

  it("ne matche pas un simple suffixe de nom (guarde contre 'Numero_Ordre_Menage__1' vs 'Numero_Ordre__1')", () => {
    const s = { 'Section/Autre_Numero_Ordre_Menage__1': 5 };
    // Cherche exactement '/Numero_Ordre_Menage__1' — la clé ci-dessus n'a pas ce
    // suffixe strict précédé d'un '/', donc on trouve bien la clé complète.
    expect(getField(s, 'Numero_Ordre_Menage__1')).toBeUndefined();
    // Alors qu'un préfixe de groupe légitime doit marcher :
    const t = { 'ENTETE_STANDARD/Numero_Ordre_Menage__1': 5 };
    expect(getField(t, 'Numero_Ordre_Menage__1')).toBe(5);
  });

  it('getFieldString convertit les nombres et rejette null/undefined/""', () => {
    expect(getFieldString({ 'g/A': 42 }, 'A')).toBe('42');
    expect(getFieldString({ 'g/A': '' }, 'A')).toBeUndefined();
    expect(getFieldString({}, 'A')).toBeUndefined();
  });
});
