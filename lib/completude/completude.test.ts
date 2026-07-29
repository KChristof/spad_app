import { describe, it, expect } from 'vitest';
import {
  completudeF5,
  completudeF6,
  completudeF7,
  completudeF8,
  completudeF01ParDistrict,
  completudeF02,
  completudeF07District,
  codeDistrictDeSoumission,
  codeEtablissementDeSoumission,
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
// Extraction champs district/établissement selon le formulaire
// ---------------------------------------------------------------------------

describe('codeDistrictDeSoumission — variantes RDM', () => {
  it('F5/F6/F7/F8 : District_Sanitaire__X (bloc ENTETE_STANDARD/)', () => {
    const sub = { 'ENTETE_STANDARD/District_Sanitaire__X': 'ABENGOUROU' } as unknown as SoumissionKobo;
    expect(codeDistrictDeSoumission(sub)).toBe('ABENGOUROU');
  });
  it('F01 : F01_01a__X (bloc f01/)', () => {
    const sub = { 'f01/F01_01a__X': 'ABENGOUROU' } as unknown as SoumissionKobo;
    expect(codeDistrictDeSoumission(sub)).toBe('ABENGOUROU');
  });
  it('F02 : F02_00_district__X (bloc f02/)', () => {
    const sub = { 'f02/F02_00_district__X': 'BONDOUKOU' } as unknown as SoumissionKobo;
    expect(codeDistrictDeSoumission(sub)).toBe('BONDOUKOU');
  });
  it('F07 : RDM_NOT02__X (bloc f07/f07_s0not/)', () => {
    const sub = { 'f07/f07_s0not/RDM_NOT02__X': 'DALOA' } as unknown as SoumissionKobo;
    expect(codeDistrictDeSoumission(sub)).toBe('DALOA');
  });
  it('renvoie null si aucun des champs candidats n’est présent', () => {
    expect(codeDistrictDeSoumission({} as SoumissionKobo)).toBeNull();
  });
});

describe('codeEtablissementDeSoumission — variantes RDM', () => {
  it('F5/F6/F7/F8 : Etablissement_Sanitaire__X', () => {
    const sub = { 'ENTETE_STANDARD/Etablissement_Sanitaire__X': 'EPHR_X' } as unknown as SoumissionKobo;
    expect(codeEtablissementDeSoumission(sub)).toBe('EPHR_X');
  });
  it('F02 : F02_01__E', () => {
    const sub = { 'f02/F02_01__E': 'EPHR_PUBLIC_DE_ABENGOUROU' } as unknown as SoumissionKobo;
    expect(codeEtablissementDeSoumission(sub)).toBe('EPHR_PUBLIC_DE_ABENGOUROU');
  });
  it('F07 : RDM_NOT03__X', () => {
    const sub = { 'f07/f07_s0not/RDM_NOT03__X': 'CSR_D_PUBLIC_X' } as unknown as SoumissionKobo;
    expect(codeEtablissementDeSoumission(sub)).toBe('CSR_D_PUBLIC_X');
  });
});

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
// F02 : nouveau — seuls les établissements ayant notifié ≥1 décès au SIG
// sont concernés. Les autres passent en « Non concerné » (spec Affinement §2).
// ---------------------------------------------------------------------------

describe('completudeF02 — audit sélectif', () => {
  it("établissement HORS périmètre d'audit → statut nonConcerne, nbAttendu null", () => {
    const e = etab({ code: 'CSR_D_X', type: 'CSR_D' });
    const r = completudeF02(e, [], { concerne: false });
    expect(r.statut).toBe('nonConcerne');
    expect(r.nbAttendu).toBeNull();
    expect(r.taux).toBeNull();
  });

  it("audit undefined équivaut à 'non concerné' (rétrocompatibilité)", () => {
    const e = etab({ code: 'CSR_D_X', type: 'CSR_D' });
    const r = completudeF02(e, []);
    expect(r.statut).toBe('nonConcerne');
  });

  it("établissement CONCERNÉ + 0 fiche → statut zero, cible 1", () => {
    const e = etab({ code: 'EPHR_X', type: 'EPHR' });
    const r = completudeF02(e, [], { concerne: true, decesNotifies: 13 });
    expect(r.statut).toBe('zero');
    expect(r.nbAttendu).toBe(1);
    expect(r.taux).toBe(0);
  });

  it("établissement CONCERNÉ + 1 fiche → plein", () => {
    const e = etab({ code: 'EPHR_X', type: 'EPHR' });
    const subs = [s({ _uuid: 'u1', Etablissement_Sanitaire__X: 'EPHR_X' })];
    const r = completudeF02(e, subs, { concerne: true, decesNotifies: 13 });
    expect(r.statut).toBe('plein');
  });

  it("HORS périmètre mais fiche reçue → statut nonConcerne + nbRecu, sans anomalie de saisie", () => {
    // Spec Chantier 5.2 : c'est un signal POSITIF (décès découvert sur le
    // terrain), pas une anomalie. La détection se fait au niveau
    // buildDashboardState → state.f02HorsListe.
    const e = etab({ code: 'CSR_D_X', type: 'CSR_D' });
    const subs = [s({ _uuid: 'u1', Etablissement_Sanitaire__X: 'CSR_D_X' })];
    const r = completudeF02(e, subs, { concerne: false });
    expect(r.statut).toBe('nonConcerne');
    expect(r.nbRecu).toBe(1);
    expect(r.anomalies).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// F07 : cible plancher (spec Affinement §2) — jamais de statut « excès »
// ---------------------------------------------------------------------------

describe('completudeF07District — cible plancher', () => {
  it('0 fiche pour un district ayant 13 décès notifiés → zero', () => {
    const r = completudeF07District('ABENGOUROU', 13, [], [], []);
    expect(r.nbRecu).toBe(0);
    expect(r.cibleMinimum).toBe(13);
    expect(r.statut).toBe('zero');
  });

  it('reçu < cible → partiel', () => {
    const f07 = Array.from({ length: 8 }, (_, i) =>
      s({ _uuid: `u${i}`, District_Sanitaire__X: 'ABENGOUROU' }),
    );
    const r = completudeF07District('ABENGOUROU', 13, f07, [], []);
    expect(r.nbRecu).toBe(8);
    expect(r.statut).toBe('partiel');
  });

  it('reçu === cible → plein (vert)', () => {
    const f07 = Array.from({ length: 13 }, (_, i) =>
      s({ _uuid: `u${i}`, District_Sanitaire__X: 'ABENGOUROU' }),
    );
    const r = completudeF07District('ABENGOUROU', 13, f07, [], []);
    expect(r.statut).toBe('plein');
  });

  it('reçu > cible → plein (JAMAIS excès — dépasser un plancher est normal)', () => {
    const f07 = Array.from({ length: 20 }, (_, i) =>
      s({ _uuid: `u${i}`, District_Sanitaire__X: 'ABENGOUROU' }),
    );
    const r = completudeF07District('ABENGOUROU', 13, f07, [], []);
    expect(r.statut).toBe('plein');
    expect(r.statut).not.toBe('exces' as never);
  });

  it('cible = 0 (aucun décès notifié dans le district) → neutre', () => {
    const r = completudeF07District('X', 0, [], [], []);
    expect(r.statut).toBe('neutre');
  });
});
