# SPAD — Dashboard de complétude

Dashboard de pilotage de la complétude de collecte de données terrain pour la
**Direction de l'Information Sanitaire (DIS)** du Ministère de la Santé de
Côte d'Ivoire, dans le cadre du projet **SPAD (Système de Production et
d'Analyse des Données)**.

L'application lit les soumissions Kobo des 7 formulaires SPAD (tabac femmes,
tabac personnel, non-vaccination ménages, non-vaccination établissement,
RDM district, RDM établissement, grille RDM), les agrège selon le référentiel
organisationnel (12 districts, 60 enquêteurs, 12 superviseurs, 120
établissements), et restitue les taux de complétude par établissement,
enquêteur, superviseur, district, région et national — jamais elle n'écrit
sur Kobo.

Stack : Next.js 15 (App Router, TypeScript, RSC) · Tailwind + shadcn/ui ·
Recharts · Prisma + Neon Postgres · déploiement Vercel.

---

## Sommaire

- [Prérequis](#prérequis)
- [Installation locale](#installation-locale)
- [Variables d'environnement](#variables-denvironnement)
- [Base Postgres — Neon (recommandé) ou Supabase](#base-postgres--neon-recommandé-ou-supabase)
- [Déploiement sur Vercel](#déploiement-sur-vercel)
- [Régénérer le référentiel](#régénérer-le-référentiel)
- [Historique et snapshots quotidiens](#historique-et-snapshots-quotidiens)
- [Formulaires non encore déployés (F5/F6)](#formulaires-non-encore-déployés-f5f6)
- [Tests](#tests)
- [Limites connues de la V1](#limites-connues-de-la-v1)

---

## Prérequis

- **Node.js ≥ 20**
- Un token API personnel KoboToolbox avec lecture sur les 7 formulaires SPAD
  (https://kf.kobotoolbox.org/#/account/settings → *API token*)
- Un compte Vercel (plan Hobby suffit pour la V1) et un projet Neon Postgres
  (via Marketplace Vercel — connexion en 1 clic)

## Installation locale

```bash
npm install
cp .env.example .env.local   # puis renseigner les valeurs
npm run build:referentiel    # génère data/referentiel.json (déjà versionné)
npm run dev                  # http://localhost:3000
```

Se connecter avec la valeur de `DASHBOARD_PASSWORD`.

## Variables d'environnement

Cf. `.env.example` — les valeurs actuellement fournies pour KOBO_API_TOKEN et
les 5 asset UID déployés sont à recopier dans `.env.local` (jamais commiter
ce fichier — il est déjà dans `.gitignore`).

| Variable | Rôle | Obligatoire ? |
|---|---|---|
| `KOBO_BASE_URL` | URL du serveur Kobo (`https://kf.kobotoolbox.org`) | Oui |
| `KOBO_API_TOKEN` | Token API personnel (jamais exposé au client) | Oui |
| `KOBO_ASSET_UID_F5` … `_F07` | UID des 7 formulaires. Laisser vide pour un formulaire non encore déployé — l'app le gère nativement. | 5/7 aujourd'hui |
| `DASHBOARD_PASSWORD` | Mot de passe unique partagé pour accéder au dashboard | Oui |
| `SESSION_SECRET` | Clé de signature du cookie de session (≥ 32 caractères). Générer : `openssl rand -base64 32` | Oui |
| `DATABASE_URL` | Postgres pour l'historique (voir section suivante). Sans, l'app fonctionne mais les tendances sont vides. | Recommandé |
| `CRON_SECRET` | Protège la route de snapshot quotidien. Vercel l'injecte automatiquement pour ses appels cron. | Sur Vercel |

## Base Postgres — Neon (recommandé) ou Supabase

Cette base sert **uniquement** à conserver l'historique des taux de
complétude par jour (table `CompletudeSnapshot`), pour afficher les courbes
de tendance sur 30 jours. Les soumissions Kobo individuelles ne sont
**jamais** persistées — elles restent lues à la volée depuis l'API Kobo
(cache Next.js de 5 min).

### Option A — Neon (recommandé)

1. Sur le dashboard Vercel, ouvrir le projet → **Storage** → **Create Database** → **Neon**.
2. Suivre l'assistant : Vercel provisionne un projet Neon gratuit et
   injecte automatiquement `DATABASE_URL` dans les 3 environnements (prod,
   preview, dev).
3. En local, récupérer la même `DATABASE_URL` depuis le dashboard Neon et
   la copier dans `.env.local`.
4. Appliquer les migrations : `npm run prisma:migrate:deploy` (prod)
   ou `npm run prisma:migrate:dev` (local — crée la migration au besoin).

### Option B — Supabase

1. Créer un projet gratuit sur https://supabase.com/.
2. Récupérer l'URL de connexion **Transaction pooler** (mode serverless-friendly).
3. Renseigner `DATABASE_URL` en local (Vercel : `Project Settings → Environment Variables`).
4. Appliquer les migrations : `npm run prisma:migrate:deploy`.

### Sauvegarde

Les offres gratuites Neon/Supabase peuvent purger les projets inactifs
après plusieurs mois sans connexion. Prévoir un export périodique
(`pg_dump`, ou export CSV manuel via l'interface de la base) et le
conserver ailleurs — la V1 ne fait pas de rattrapage rétroactif.

## Déploiement sur Vercel

```bash
# À la racine du repo
npx vercel deploy       # premier deploy — préview
npx vercel deploy --prod
```

Points à ne pas oublier après le premier déploiement :

1. **Variables d'environnement** : renseigner toutes les variables du
   tableau ci-dessus dans `Project Settings → Environment Variables`
   (prod, preview et dev).
2. **Neon** : ajouter l'intégration Marketplace (`Storage → Neon`).
   `DATABASE_URL` est injecté automatiquement.
3. **Migration** : après le premier deploy, exécuter la migration
   initiale (soit en local avec la même DATABASE_URL, soit via un
   « build command » Vercel étendu à `prisma migrate deploy && next build`).
4. **Cron** : le fichier `vercel.json` déclenche
   `GET /api/cron/snapshot` tous les jours à 03:00 UTC. Vercel injecte
   automatiquement le header `Authorization: Bearer <CRON_SECRET>` pour
   ses appels — aucune action de votre part.

## Régénérer le référentiel

Le référentiel organisationnel (régions, districts, enquêteurs,
superviseurs, établissements) est extrait des onglets `choices` des
4 XLSForm enquêteurs (dossier `reference-data/`). Le résultat est
versionné dans `data/referentiel.json`.

Le regénérer **uniquement quand la liste change** (nouvel enquêteur,
nouvel établissement pilote, ajout d'un district, etc.) :

```bash
npm run build:referentiel
git add data/referentiel.json
git commit -m "Mise à jour du référentiel SPAD"
```

Le script exécute des contrôles de cohérence (12 régions, 12 districts,
60 enquêteurs, 12 superviseurs, 120 établissements, 5 enquêteurs par
district, 10 établissements par district, 2 établissements par enquêteur,
types d'établissements reconnus) et signale toute divergence.

## Historique et snapshots quotidiens

À chaque exécution du cron (03:00 UTC quotidien) :

1. La route `/api/cron/snapshot` recalcule la complétude courante depuis
   l'API Kobo (comme l'affichage en direct).
2. Elle enregistre une ligne par `(district | établissement) × formulaire`
   dans `CompletudeSnapshot`, avec un **upsert** sur la contrainte unique
   `(dateSnapshot, districtCode, etablissementCode, formulaireId)` —
   rejouer manuellement le cron pour le même jour n'écrit pas de doublons.
3. Les vues « Tendance 30 jours » (nationale et district) lisent ensuite
   ces snapshots.

Rejeu manuel :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<votre-app>.vercel.app/api/cron/snapshot
```

## Formulaires non encore déployés (F5/F6)

Au 28/07/2026, seuls 5 formulaires sur 7 sont déployés sur Kobo. F5 et F6
(volet tabac) le seront dans la nuit du 30 juillet 2026.

- Tant que `KOBO_ASSET_UID_F5` / `KOBO_ASSET_UID_F6` sont vides, un badge
  gris **« Pas encore déployé »** apparaît partout et le formulaire est
  exclu des moyennes de complétude — ce n'est **pas** un état d'erreur.
- Dès que ces variables sont renseignées dans Vercel (`Project Settings →
  Environment Variables` → *Save*) et que l'app est redéployée
  (ou même simplement re-buildée), le formulaire bascule automatiquement
  en suivi actif. **Aucune modification de code n'est nécessaire**.

## Tests

```bash
npm test         # Vitest — fonctions de complétude (F5/F6/F7/F8/F01/F07)
npm run test:watch
```

Les tests critiques couvrent les 4 cas de cible du formulaire 6
(CSR_D=1, CSR_DM=2, CSU/EPH=3, INCONNU=1), la déduplication `_uuid`
pour F5, les doublons `Numero_Ordre_Menage__1` pour F7, et le fait que
F07 ne renvoie **jamais** un pourcentage de complétude classique
(indicateur de cohérence uniquement).

## Limites connues de la V1

- **Pas de comptes nominatifs** — un seul mot de passe partagé. La
  distinction enquêteur / superviseur / district est un filtre de
  navigation, pas un système de permissions.
- **Historique non rétroactif** — le premier snapshot ne peut être
  qu'à partir de la mise en production. Les jours antérieurs à la
  première exécution du cron restent vides sur la courbe de tendance.
  Le graphique affiche un message « historique en cours de
  constitution » tant qu'il y a moins de 2 jours de recul.
- **Pas de notifications automatiques** (email/WhatsApp) — la V1
  affiche les alertes dans le dashboard uniquement.
- **Pas de carte géographique** — vue tableau/liste uniquement en V1.
- **Cache Kobo 5 min** — un clic sur *Rafraîchir maintenant* force
  une nouvelle lecture immédiate.

## Architecture (résumé)

```
app/
  (dashboard)/           Routes protégées (middleware)
    page.tsx             Vue nationale (KPI + tendance + grille districts)
    regions/             Vue par région
    districts/
      page.tsx           Grille des 12 districts
      [code]/page.tsx    Fiche district (superviseur + enquêteurs + établissements)
    enqueteurs/          Liste + fiche enquêteur (F5/F6/F7/F8 sur ses 2 étab.)
    superviseurs/        Liste + fiche superviseur (F01/F02/F07)
    etablissements/[code]/  Fiche établissement (5 formulaires + détail F6)
    anomalies/           Vue consolidée
    export/              CSV / XLSX
  api/
    login,logout         Auth par mot de passe partagé (iron-session)
    rafraichir           Revalide le cache Next.js par tag
    cron/snapshot        Cron quotidien Vercel (upsert dans Prisma)
    export               CSV/XLSX

lib/
  kobo/
    client.ts            Fetch v2 paginé, cache 5 min, tag par formulaire
    formulaires.ts       Config des 7 formulaires + asset UID par env var
  referentiel/
    types.ts             Types + cibleF6ParType + professionsAttenduesF6
    data.ts              Chargement du referentiel.json + lookups
  completude/
    index.ts             Fonctions PURES de calcul (spec section 3)
    agregations.ts       District → région → national
    statut.ts            Mapping taux → statut (rouge/orange/vert/violet/gris)
  data/dashboard.ts      Orchestration: 1 seul appel utilisé par pages ET cron
  db/
    prisma.ts            Client Prisma + adaptateur Neon serverless
    snapshots.ts         Lecture des séries de tendance
  auth/session.ts        iron-session (cookie httpOnly signé)

data/referentiel.json    Généré (versionné) — source de vérité orga
reference-data/*.xlsx    XLSForm Kobo (source du référentiel + specs)
prisma/schema.prisma     CompletudeSnapshot uniquement
scripts/build-referentiel.ts   Régénération du referentiel.json
```

## Support

Pour toute question ou bug, ouvrir un ticket dans le dépôt Git du projet.
