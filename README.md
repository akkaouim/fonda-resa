# Fonda Resa

Logiciel de gestion du materiel pour le tiers-lieu de l'Esviere (Fondacio Angers).

Permet a une trentaine de personnes habilitees de consulter l'inventaire du materiel audiovisuel et technique, de reserver du materiel en ligne, et aux administrateurs de suivre les entrees/sorties.

## Fonctionnalites

- **Inventaire** : catalogue complet avec categories, sous-categories, localisations, etats, import CSV, et jusqu'a 6 photos par item
- **Reservations** : formulaire multi-items avec gestion des quantites, validation du perimetre d'utilisation, workflow d'approbation admin, notifications par email
- **Entrees/sorties** : suivi des mouvements physiques, liaison avec les reservations, gestion des consommables
- **Referentiel** : les admins creent, renomment et suppriment categories, sous-categories et localisations depuis la page Inventaire
- **Gestion des comptes** : creation par les admins uniquement, roles membre/admin, reset de mot de passe
- **Tableaux de bord** : vue membre (reservations en cours) et admin (alertes, statistiques)

## Stack technique

| Composant | Technologie |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Base de donnees | PostgreSQL + Prisma ORM |
| Authentification | JWT (access + refresh token) |
| Emails | Nodemailer (SMTP) |
| Tests | Vitest, et Testing Library cote frontend |
| CI/CD | GitHub Actions |

## Prerequis

- **Node.js** >= 20
- **Docker** et Docker Compose (pour PostgreSQL en dev)

## Installation locale

```bash
# 1. Cloner le repository
git clone https://github.com/akkaouim/fonda-resa.git
cd fonda-resa

# 2. Installer les dependances
npm install

# 3. Copier et configurer l'environnement
cp .env.example .env
# Editer .env si besoin (les valeurs par defaut fonctionnent en dev)

# 4. Demarrer PostgreSQL et MailHog
docker compose up -d

# 5. Appliquer les migrations
npm run db:migrate -w packages/api

# 6. Inserer les donnees de demo
npm run db:seed -w packages/api
```

## Developpement

```bash
# Demarrer le backend (port 3000)
npm run dev:api

# Dans un autre terminal, demarrer le frontend (port 5173)
npm run dev:web
```

Le frontend redirige automatiquement les appels `/api` et `/uploads` vers le backend.

### Comptes de demo

| Email | Mot de passe | Role |
|---|---|---|
| admin@esviere.fr | admin1234 | Administrateur |
| membre@esviere.fr | membre1234 | Membre |

### Emails en developpement

MailHog capture tous les emails envoyes en dev.
Interface web : http://localhost:8025

### Tests

```bash
npm run test -w packages/api
npm run test -w packages/web
```

### Verifier les types

Attention : `npm run typecheck -w packages/web` ne verifie rien. Le
`tsconfig.json` du package est un fichier solution avec `"files": []`, donc
`tsc --noEmit` s'arrete sans lire une seule source. Utiliser :

```bash
npx tsc --noEmit -p packages/api/tsconfig.json
npx tsc --noEmit -p packages/web/tsconfig.app.json
```

Le `npm run build:web` fait aussi le travail, via `tsc -b`.

## Structure du projet

```
fonda-resa/
  .github/workflows/
    ci.yml               Verifications puis deploiement (un seul workflow)
  packages/
    api/                 Backend Express + Prisma + PostgreSQL
      prisma/            Schema, migrations, seed
      src/
        config/          Env, database, logger, chemins d'upload
        middleware/      Auth JWT, validation, gestion d'erreurs
        modules/         Auth, users, categories, localisations,
                         items, reservations, mouvements, dashboard
        services/        Email, audit
        shared/          Types, schemas Zod, helpers purs
        __tests__/       Tests unitaires (vitest)
    web/                 Frontend React + Vite + Tailwind CSS
      src/
        components/      Layout, formulaires admin, galerie photo
        hooks/           Hooks TanStack Query (auth, items, etc.)
        pages/           Pages membre et admin
        stores/          Zustand (auth)
        lib/             Client API avec refresh token, validation photo
  docs/superpowers/      Specs et plans d'implementation
  docker-compose.yml     Dev local : PostgreSQL + MailHog
  docker-compose.prod.yml  Production : API + PostgreSQL derriere Caddy
  .env.example           Variables d'environnement documentees
```

Les types partages entre l'API et le frontend sont **dupliques** dans
`packages/api/src/shared/` et `packages/web/src/shared/`. Le workspace commun
a ete retire ; les deux copies doivent rester identiques.

## Deploiement

La production tourne sur un VPS, en conteneurs Docker. `docker-compose.prod.yml`
construit l'image de l'application **sur le serveur** et la place derriere un
Caddy mutualise qui gere le TLS. Les photos televersees vivent dans un volume
Docker, hors du depot.

### Deploiement automatique

Pousser sur `main` declenche `.github/workflows/ci.yml`, qui enchaine deux jobs :

1. **check** — installe, genere le client Prisma, verifie les types, lance les
   tests API et frontend, construit le frontend.
2. **deploy** — ne demarre **que si le premier a reussi**. Il synchronise les
   sources vers le serveur, reconstruit l'image, redemarre la pile, puis
   applique les migrations Prisma.

Un lancement manuel est possible depuis l'onglet Actions ; il est refuse
ailleurs que sur `main`.

> **Pousser sur `main`, c'est deployer en production.** Les migrations Prisma
> sont appliquees automatiquement, sans validation manuelle, et certaines sont
> irreversibles. Verifier toute migration sur une base locale avant de pousser.

### Secrets requis

A definir dans **Settings > Secrets and variables > Actions** :

| Secret | Role |
|---|---|
| `SSH_PRIVATE_KEY` | Cle privee de deploiement, sa moitie publique etant dans `~/.ssh/authorized_keys` du serveur |
| `REMOTE_HOST` | Hote du VPS |
| `REMOTE_USER` | Utilisateur SSH |
| `REMOTE_PATH` | Repertoire de deploiement sur le serveur |

Tant que ces secrets sont absents, le job `deploy` se termine en succes sans
rien faire, avec une note dans les logs.

### Configuration du serveur

Le serveur conserve son propre `.env.production`, qui contient le mot de passe
de la base et les secrets JWT. Le workflow **ne le televerse jamais** et
l'exclut explicitement de la synchronisation, au meme titre que `uploads/`.

## Variables d'environnement

Voir [`.env.example`](.env.example) pour la liste complete avec descriptions.

## Licence

MIT — voir [LICENSE](LICENSE)
