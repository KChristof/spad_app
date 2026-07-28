import 'server-only';

/**
 * Charge `data/contacts-enqueteurs.json` s'il existe (72 entrées : enquêteurs
 * + superviseurs). Absence de fichier / de code enquêteur → renvoie undefined
 * plutôt qu'inventer une valeur.
 *
 * Format : { "D01ENQ1": { nom, telephone, email, profil, district }, ... }
 */

export interface Contact {
  nom: string;
  telephone?: string;
  email?: string;
  profil: 'Enqueteur' | 'Superviseur';
  district?: string;
}

// Import statique — Next 15 traite l'absence du fichier au build. On l'a
// fourni dans le repo, mais s'il est vide/malformé on retombe sur {}.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
let raw: Record<string, Contact> = {};
try {
  // Import dynamique protégé par un try/catch — pas de plantage au build si absent.
  // On utilise require pour bénéficier du try, l'import ESM ne peut pas être conditionnel.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  raw = require('@/data/contacts-enqueteurs.json') as Record<string, Contact>;
} catch {
  raw = {};
}

const CONTACTS = raw;

export function getContact(code: string): Contact | undefined {
  return CONTACTS[code];
}

export function getNom(code: string, fallbackLibelle?: string): string {
  const c = CONTACTS[code];
  if (c?.nom) return c.nom;
  // Fallback : ancien parsing du libellé Kobo si le contact est absent
  if (fallbackLibelle) {
    const m = fallbackLibelle.match(/—\s*(.+?)\s*\(/);
    if (m) return m[1].trim();
  }
  return code;
}

export function getTelephone(code: string): string {
  return CONTACTS[code]?.telephone ?? '';
}

export function getEmail(code: string): string {
  return CONTACTS[code]?.email ?? '';
}
