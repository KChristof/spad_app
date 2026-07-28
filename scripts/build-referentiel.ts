/**
 * Génère data/referentiel.json à partir des XLSForm Kobo présents dans
 * reference-data/. Exécuter avec:
 *
 *   npm run build:referentiel
 *
 * Ce fichier est versionné dans le repo — le regénérer uniquement quand
 * la liste des districts, enquêteurs, superviseurs ou établissements
 * change (nouveaux enquêteurs ajoutés, nouvel établissement pilote…).
 */

import * as XLSX from 'xlsx';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  Referentiel,
  Region,
  District,
  Enqueteur,
  Superviseur,
  Etablissement,
  EtablissementType,
} from '../lib/referentiel/types';

const REFERENCE_DIR = path.resolve(process.cwd(), 'reference-data');
const OUTPUT_FILE = path.resolve(process.cwd(), 'data', 'referentiel.json');

// Les 4 XLSForm enquêteurs partagent les mêmes listes admin ; on lit
// prioritairement le formulaire 5 et on croise avec les autres pour détecter
// toute divergence de listes.
const SOURCE_FORMS = [
  '5_PNLTA_SPAD_Fiche_Femmes_Enceintes_Allaitantes_Tabac.xlsx',
  '6_PNLTA_SPAD_Fiche_CAP_Personnel_de_Sante_Tabac.xlsx',
  '7_PEV_SPAD_Fiche_Menage_Non_Vaccination.xlsx',
  '8_PEV_SPAD_Fiche_Etablissement_Non_Vaccination.xlsx',
];

type ChoiceRow = Record<string, unknown> & {
  list_name?: string;
  name?: string;
  code_id?: string;
  region_code?: string;
  district_code?: string;
  enqueteur_code?: string;
};

function labelOf(row: ChoiceRow): string {
  for (const k of Object.keys(row)) {
    if (k.startsWith('label')) return String(row[k] ?? '');
  }
  return String(row.name ?? '');
}

function readChoices(filename: string): ChoiceRow[] {
  const full = path.join(REFERENCE_DIR, filename);
  if (!fs.existsSync(full)) throw new Error(`Fichier introuvable: ${full}`);
  const wb = XLSX.readFile(full);
  const sheet = wb.Sheets['choices'];
  if (!sheet) throw new Error(`Onglet 'choices' absent dans ${filename}`);
  return XLSX.utils.sheet_to_json<ChoiceRow>(sheet);
}

function extractRegions(choices: ChoiceRow[]): Region[] {
  return choices
    .filter((r) => r.list_name === 'Admin_Region_Sanitaire_')
    .map((r) => ({ code: String(r.name), libelle: labelOf(r) }));
}

function extractDistricts(choices: ChoiceRow[]): District[] {
  return choices
    .filter((r) => r.list_name === 'Admin_District_Sanitaire_')
    .map((r) => ({
      code: String(r.name),
      codeId: String(r.code_id ?? ''),
      libelle: labelOf(r),
      regionCode: String(r.region_code ?? ''),
    }));
}

function extractEnqueteurs(choices: ChoiceRow[]): Enqueteur[] {
  return choices
    .filter((r) => r.list_name === 'Admin_Enqueteur_')
    .map((r) => {
      const libelle = labelOf(r);
      // Format attendu: "ENQUETEUR <DISTRICT> N°N — NOM PRENOM (CODE)"
      const nomMatch = libelle.match(/—\s*([^(]+?)\s*\(/);
      return {
        code: String(r.name),
        nom: nomMatch ? nomMatch[1].trim() : '',
        libelleComplet: libelle,
        districtCode: String(r.district_code ?? ''),
        regionCode: String(r.region_code ?? ''),
      };
    });
}

function extractSuperviseurs(choices: ChoiceRow[]): Superviseur[] {
  return choices
    .filter((r) => r.list_name === 'Admin_Superviseur_')
    .map((r) => {
      const libelle = labelOf(r);
      const nomMatch = libelle.match(/—\s*(.+?)\s*\(/);
      return {
        code: String(r.name),
        nom: nomMatch ? nomMatch[1].trim() : '',
        libelleComplet: libelle,
        districtCode: String(r.district_code ?? ''),
        regionCode: String(r.region_code ?? ''),
      };
    });
}

function detectEtablissementType(codeKobo: string): EtablissementType {
  const known: EtablissementType[] = [
    'EPHR', 'EPHD', 'CSU_DM', 'CSU_D', 'CSUS_PMI', 'CSR_DM', 'CSR_D',
  ];
  // Le préfixe est le token avant _PUBLIC_ ou _PRIVE_.
  const upper = codeKobo.toUpperCase();
  for (const t of known) {
    if (upper.startsWith(t + '_PUBLIC_') || upper.startsWith(t + '_PRIVE_')) {
      return t;
    }
  }
  return 'INCONNU';
}

function extractEtablissements(choices: ChoiceRow[]): Etablissement[] {
  return choices
    .filter((r) => r.list_name === 'Admin_Etablissement_Sante_')
    .map((r) => {
      const code = String(r.name);
      return {
        code,
        codeId: String(r.code_id ?? ''),
        libelle: labelOf(r),
        type: detectEtablissementType(code),
        districtCode: String(r.district_code ?? ''),
        regionCode: String(r.region_code ?? ''),
        enqueteurCode: String(r.enqueteur_code ?? ''),
      };
    });
}

function crossCheck(base: Referentiel): void {
  // Contrôles de cohérence: 12 régions, 12 districts, 60 enquêteurs, 12 superviseurs, 120 établissements
  const errors: string[] = [];
  if (base.regions.length !== 12) errors.push(`régions attendues 12, trouvées ${base.regions.length}`);
  if (base.districts.length !== 12) errors.push(`districts attendus 12, trouvés ${base.districts.length}`);
  if (base.enqueteurs.length !== 60) errors.push(`enquêteurs attendus 60, trouvés ${base.enqueteurs.length}`);
  if (base.superviseurs.length !== 12) errors.push(`superviseurs attendus 12, trouvés ${base.superviseurs.length}`);
  if (base.etablissements.length !== 120) errors.push(`établissements attendus 120, trouvés ${base.etablissements.length}`);

  // Enquêteurs: 5 par district
  const enqParDistrict = new Map<string, number>();
  for (const e of base.enqueteurs) {
    enqParDistrict.set(e.districtCode, (enqParDistrict.get(e.districtCode) ?? 0) + 1);
  }
  for (const [d, n] of enqParDistrict) {
    if (n !== 5) errors.push(`district ${d}: ${n} enquêteurs (attendu 5)`);
  }

  // Établissements: 10 par district
  const etabParDistrict = new Map<string, number>();
  for (const e of base.etablissements) {
    etabParDistrict.set(e.districtCode, (etabParDistrict.get(e.districtCode) ?? 0) + 1);
  }
  for (const [d, n] of etabParDistrict) {
    if (n !== 10) errors.push(`district ${d}: ${n} établissements (attendu 10)`);
  }

  // Établissements: 2 par enquêteur
  const etabParEnq = new Map<string, number>();
  for (const e of base.etablissements) {
    etabParEnq.set(e.enqueteurCode, (etabParEnq.get(e.enqueteurCode) ?? 0) + 1);
  }
  for (const [e, n] of etabParEnq) {
    if (n !== 2) errors.push(`enquêteur ${e}: ${n} établissements (attendu 2)`);
  }

  // Types inconnus
  const inconnus = base.etablissements.filter((e) => e.type === 'INCONNU');
  if (inconnus.length > 0) {
    errors.push(`${inconnus.length} établissement(s) de type INCONNU: ${inconnus.slice(0, 3).map((e) => e.code).join(', ')}${inconnus.length > 3 ? '…' : ''}`);
  }

  if (errors.length > 0) {
    console.warn('\n⚠️  Anomalies de référentiel détectées:');
    errors.forEach((e) => console.warn('   -', e));
    console.warn('   (Le référentiel est tout de même écrit; vérifier les XLSForm si nécessaire.)\n');
  } else {
    console.log('✅ Contrôles de cohérence: tout est conforme.');
  }
}

function main() {
  console.log('🔎 Lecture du formulaire 5 (source de vérité pour les listes admin)…');
  const choices5 = readChoices(SOURCE_FORMS[0]);

  const regions = extractRegions(choices5);
  const districts = extractDistricts(choices5);
  const enqueteurs = extractEnqueteurs(choices5);
  const superviseurs = extractSuperviseurs(choices5);
  const etablissements = extractEtablissements(choices5);

  console.log(`   - ${regions.length} régions`);
  console.log(`   - ${districts.length} districts`);
  console.log(`   - ${enqueteurs.length} enquêteurs`);
  console.log(`   - ${superviseurs.length} superviseurs`);
  console.log(`   - ${etablissements.length} établissements`);

  // Croiser rapidement avec les autres formulaires pour détecter une divergence
  console.log('\n🔎 Contrôle croisé sur les autres XLSForm…');
  for (const f of SOURCE_FORMS.slice(1)) {
    const c = readChoices(f);
    const dist = c.filter((r) => r.list_name === 'Admin_District_Sanitaire_').length;
    const etab = c.filter((r) => r.list_name === 'Admin_Etablissement_Sante_').length;
    if (dist !== districts.length || etab !== etablissements.length) {
      console.warn(`   ⚠️  ${f}: districts=${dist}, établissements=${etab} (divergence avec ${SOURCE_FORMS[0]})`);
    } else {
      console.log(`   ✓  ${f}: listes cohérentes`);
    }
  }

  const referentiel: Referentiel = {
    meta: {
      genereLe: new Date().toISOString(),
      sourceForms: SOURCE_FORMS,
    },
    regions,
    districts,
    enqueteurs,
    superviseurs,
    etablissements,
  };

  crossCheck(referentiel);

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(referentiel, null, 2), 'utf8');
  console.log(`\n💾 Référentiel écrit: ${path.relative(process.cwd(), OUTPUT_FILE)}`);
}

main();
