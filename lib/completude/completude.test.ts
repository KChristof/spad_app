import { describe, it, expect } from 'vitest';
import {
  completudeF5,
  completudeF6,
  completudeF7,
  completudeF8,
  completudeF01ParDistrict,
  coherenceF07,
} from './index';
import type { Etablissement, EtablissementType } from '@/lib/referentiel/types';
import type { SoumissionKobo } from '@/lib/kobo/types';

function etab(overrides: Partial<Etablissement> & { type: EtablissementType }): Etablissement {
  return {
    code: 'CSR_D_PUBLIC_DE_TEST',
    codeId: 'E01',
    libelle: 'Test',
    districtCode: 'ABENGOUROU',
    regionCode: 'INDENIE_DUABLIN',
    enqueteurCode: 'D01ENQ1',
    ...overrides,
  };
}

function s(fields: Partial<SoumissionKobo> & { _uuid: string }): SoumissionKobo {
  return { _id: fields._uuid, ...fields } as SoumissionKobo;
}

// ---------------------------------------------------------------------------
// F5 & F7 : cible fixe 15 par établissement
// ---------------------------------------------------------------------------

describe('completudeF5', () => {
  it('renvoie 0/15 (zéro) sans soumission', () => {
    const e = etab({ type: 'CSU_DM' });
    const r = completudeF5(e, []);
    expect(r.nbRecu).toBe(0);
    expect(r.nbAttendu).toBe(15);
    expect(r.taux).toBe(0);
    expect(r.statut).toBe('zero');
  });

  it('renvoie 15/15 (plein) avec 15 soumissions distinctes', () => {
    const e = etab({ code: 'CSU_DM_PUBLIC_A', type: 'CSU_DM' });
    const subs = Array.from({ length: 15 }, (_, i) =>
      s({ _uuid: `u${i}`, Etablissement_Sanitaire__X: 'CSU_DM_PUBLIC_A' }),
    );
    const r = completudeF5(e, subs);
    expect(r.nbRecu).toBe(15);
    expect(r.taux).toBe(1);
    expect(r.statut).toBe('plein');
  });

  it('déduplique sur _uuid (Code_Participante__E non fiable)', () => {
    const e = etab({ code: 'X', type: 'CSU_DM' });
    const subs: SoumissionKobo[] = [
      s({ _uuid: 'u1', Etablissement_Sanitaire__X: 'X', Code_Participante__E: 'P1' }),
      s({ _uuid: 'u1', Etablissement_Sanitaire__X: 'X', Code_Participante__E: 'P2' }),
    ];
    const r = completudeF5(e, subs);
    expect(r.nbRecu).toBe(1);
  });

  it('signale une anomalie en cas de dépassement de cible', () => {
    const e = etab({ code: 'Y', type: 'CSU_DM' });
    const subs = Array.from({ length: 17 }, (_, i) =>
      s({ _uuid: `u${i}`, Etablissement_Sanitaire__X: 'Y' }),
    );
    const r = completudeF5(e, subs);
    expect(r.statut).toBe('exces');
    expect(r.anomalies.join(' ')).toMatch(/supérieur/i);
  });
});

describe('completudeF7 — soumissions Kobo réelles (clés préfixées par groupe)', () => {
  it("compte correctement les soumissions dont les champs sont enveloppés dans ENTETE_STANDARD/", () => {
    const e = etab({ code: 'CSU_DM_PUBLIC_DE_APPOISSO', type: 'CSU_DM' });
    // Simule ce que retourne réellement l'API Kobo v2 pour F7
    const subs: SoumissionKobo[] = Array.from({ length: 12 }, (_, i) => ({
      _id: i,
      _uuid: `u${i}`,
      'ENTETE_STANDARD/Etablissement_Sanitaire__X': 'CSU_DM_PUBLIC_DE_APPOISSO',
      'ENTETE_STANDARD/District_Sanitaire__X': 'ABENGOUROU',
      'ENTETE_STANDARD/Numero_Ordre_Menage__1': i + 1,
    })) as unknown as SoumissionKobo[];
    const r = completudeF7(e, subs);
    expect(r.nbRecu).toBe(12);
    expect(r.taux).toBeCloseTo(12 / 15);
    expect(r.statut).toBe('partiel');
  });
});

describe('completudeF7', () => {
  it('détecte les doublons de Numero_Ordre_Menage__1', () => {
    const e = etab({ code: 'Z', type: 'CSU_DM' });
    const subs: SoumissionKobo[] = [
      s({ _uuid: 'a', Etablissement_Sanitaire__X: 'Z', Numero_Ordre_Menage__1: 1 }),
      s({ _uuid: 'b', Etablissement_Sanitaire__X: 'Z', Numero_Ordre_Menage__1: 1 }),
      s({ _uuid: 'c', Etablissement_Sanitaire__X: 'Z', Numero_Ordre_Menage__1: 2 }),
    ];
    const r = completudeF7(e, subs);
    expect(r.nbRecu).toBe(3);
    expect(r.anomalies.join(' ')).toMatch(/doublon/i);
  });
});

// ---------------------------------------------------------------------------
// F8 : 1 par établissement
// ---------------------------------------------------------------------------

describe('completudeF8', () => {
  it('atteint la cible avec exactement 1 soumission', () => {
    const e = etab({ code: 'A', type: 'CSR_D' });
    const r = completudeF8(e, [s({ _uuid: 'u1', Etablissement_Sanitaire__X: 'A' })]);
    expect(r.taux).toBe(1);
    expect(r.statut).toBe('plein');
  });

  it('détecte les doublons (>1)', () => {
    const e = etab({ code: 'A', type: 'CSR_D' });
    const r = completudeF8(e, [
      s({ _uuid: 'u1', Etablissement_Sanitaire__X: 'A' }),
      s({ _uuid: 'u2', Etablissement_Sanitaire__X: 'A' }),
    ]);
    expect(r.statut).toBe('exces');
  });
});

// ---------------------------------------------------------------------------
// F6 : cible VARIABLE selon type d'établissement (spec section 3.4)
// ---------------------------------------------------------------------------

describe('completudeF6 — cible variable', () => {
  const soumF6 = (etabCode: string, profession: string, uuid: string) =>
    s({ _uuid: uuid, Etablissement_Sanitaire__X: etabCode, Profession__X: profession });

  it('CSR_D : cible = 1, seul infirmier attendu', () => {
    const e = etab({ code: 'CSR_D_X', type: 'CSR_D' });
    const r = completudeF6(e, [soumF6('CSR_D_X', 'infirmier', 'u1')]);
    expect(r.nbAttendu).toBe(1);
    expect(r.nbRecu).toBe(1);
    expect(r.taux).toBe(1);
    expect(r.statut).toBe('plein');
    expect(r.detailF6?.attendus).toEqual(['infirmier']);
  });

  it('CSR_DM : cible = 2, infirmier + sage-femme/maïeuticien', () => {
    const e = etab({ code: 'CSR_DM_X', type: 'CSR_DM' });
    const r1 = completudeF6(e, [soumF6('CSR_DM_X', 'infirmier', 'u1')]);
    expect(r1.nbAttendu).toBe(2);
    expect(r1.nbRecu).toBe(1);
    expect(r1.taux).toBe(0.5);
    expect(r1.statut).toBe('partiel');

    const r2 = completudeF6(e, [
      soumF6('CSR_DM_X', 'infirmier', 'u1'),
      soumF6('CSR_DM_X', 'sage_femme', 'u2'),
    ]);
    expect(r2.nbRecu).toBe(2);
    expect(r2.statut).toBe('plein');
  });

  it('CSU_DM : cible = 3, médecin + infirmier + sage-femme/maïeuticien', () => {
    const e = etab({ code: 'CSU_DM_X', type: 'CSU_DM' });
    const r = completudeF6(e, [
      soumF6('CSU_DM_X', 'medecin', 'u1'),
      soumF6('CSU_DM_X', 'infirmier', 'u2'),
      soumF6('CSU_DM_X', 'sage_femme', 'u3'),
    ]);
    expect(r.nbAttendu).toBe(3);
    expect(r.nbRecu).toBe(3);
    expect(r.taux).toBe(1);
    expect(r.detailF6?.manquants).toEqual([]);
  });

  it('EPHR : cible = 3, doit être atteinte avec médecin+inf+SF', () => {
    const e = etab({ code: 'EPHR_X', type: 'EPHR' });
    const r = completudeF6(e, [
      soumF6('EPHR_X', 'medecin', 'u1'),
      soumF6('EPHR_X', 'infirmier', 'u2'),
    ]);
    expect(r.nbAttendu).toBe(3);
    expect(r.nbRecu).toBe(2);
    expect(r.detailF6?.manquants).toEqual(['sage_femme_ou_maieuticien']);
    expect(r.statut).toBe('partiel');
  });

  it("signale un doublon si la même profession est enquêtée deux fois", () => {
    const e = etab({ code: 'CSR_DM_X', type: 'CSR_DM' });
    const r = completudeF6(e, [
      soumF6('CSR_DM_X', 'infirmier', 'u1'),
      soumF6('CSR_DM_X', 'infirmier', 'u2'),
    ]);
    // nbRecu = 1 (professions distinctes), doublon signalé
    expect(r.nbRecu).toBe(1);
    expect(r.detailF6?.doublons).toContain('infirmier');
    expect(r.anomalies.join(' ')).toMatch(/doublon/i);
  });

  it('type INCONNU : cible plancher = 1 + anomalie de référentiel', () => {
    const e = etab({ code: 'MYSTERY_X', type: 'INCONNU' });
    const r = completudeF6(e, []);
    expect(r.nbAttendu).toBe(1);
    expect(r.taux).toBe(0);
    expect(r.anomalies.join(' ')).toMatch(/non reconnu/i);
  });

  it('normalise les variantes de libellé (médecin/medecin, gynécologue)', () => {
    const e = etab({ code: 'EPHR_X', type: 'EPHR' });
    const r = completudeF6(e, [
      soumF6('EPHR_X', 'Gynécologue', 'u1'),
      soumF6('EPHR_X', 'infirmière', 'u2'),
      soumF6('EPHR_X', 'sage-femme', 'u3'),
    ]);
    expect(r.nbRecu).toBe(3);
    expect(r.taux).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// F01 : 1 par district
// ---------------------------------------------------------------------------

describe('completudeF01ParDistrict', () => {
  it('cible 1 par district', () => {
    const r = completudeF01ParDistrict('ABENGOUROU', [
      s({ _uuid: 'u1', District_Sanitaire__X: 'ABENGOUROU' }),
    ]);
    expect(r.taux).toBe(1);
    expect(r.statut).toBe('plein');
  });

  it('renvoie zéro si le district n’a rien envoyé', () => {
    const r = completudeF01ParDistrict('BONDOUKOU', []);
    expect(r.nbRecu).toBe(0);
    expect(r.statut).toBe('zero');
  });
});

// ---------------------------------------------------------------------------
// F07 : PAS de cible fixe — cohérence uniquement (spec section 3.7)
// ---------------------------------------------------------------------------

describe('coherenceF07', () => {
  it('ecart = 0 quand F07 couvre tous les décès revus déclarés', () => {
    const f07 = [
      s({ _uuid: 'a', District_Sanitaire__X: 'D' }),
      s({ _uuid: 'b', District_Sanitaire__X: 'D' }),
    ];
    const f01 = [s({ _uuid: 'x', District_Sanitaire__X: 'D', F01_05__1: 2 })];
    const f02 = [
      s({ _uuid: 'y', District_Sanitaire__X: 'D', F02_09__1: 1 }),
      s({ _uuid: 'z', District_Sanitaire__X: 'D', F02_09__1: 1 }),
    ];
    const r = coherenceF07('D', f07, f01, f02);
    expect(r.nbF07).toBe(2);
    expect(r.nbDecesRevusDeclaresF01).toBe(2);
    expect(r.nbDecesRevusDeclaresF02).toBe(2);
    expect(r.ecart).toBe(0);
    expect(r.statut).toBe('ok');
  });

  it('ecart > 0 quand des revues F07 manquent', () => {
    const f01 = [s({ _uuid: 'x', District_Sanitaire__X: 'D', F01_05__1: 5 })];
    const f02: SoumissionKobo[] = [];
    const r = coherenceF07('D', [], f01, f02);
    expect(r.nbF07).toBe(0);
    expect(r.ecart).toBe(5);
    expect(r.statut).toBe('ecart');
  });

  it('ne renvoie JAMAIS un pourcentage de complétude classique', () => {
    // Contrôle explicite: le résultat ne contient pas de champ `taux`.
    const r = coherenceF07('D', [], [], []);
    expect((r as unknown as { taux?: unknown }).taux).toBeUndefined();
  });
});
