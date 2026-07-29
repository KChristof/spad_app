import 'server-only';
import contactsData from '@/data/contacts-enqueteurs.json';

/**
 * Charge `data/contacts-enqueteurs.json` (72 entrées : enquêteurs +
 * superviseurs). Absence de code enquêteur dans le fichier → renvoie
 * undefined / chaîne vide plutôt qu'inventer une valeur.
 *
 * Format : { "D01ENQ1": { nom, telephone, email, profil, district }, ... }
 *
 * NB : import statique ESM (Next 15.5 ne fournit plus `require` dans les
 * modules serveur). Le fichier étant versionné dans le repo, il est
 * toujours présent au build.
 */

export interface Contact {
  nom: string;
  telephone?: string | null;
  email?: string | null;
  profil?: string; // 'Enqueteur' | 'Superviseur' — non validé côté type
  district?: string;
}

const CONTACTS = contactsData as unknown as Record<string, Contact>;

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
  const v = CONTACTS[code]?.telephone;
  return v ?? '';
}

export function getEmail(code: string): string {
  const v = CONTACTS[code]?.email;
  return v ?? '';
}
