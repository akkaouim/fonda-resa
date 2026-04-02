# Resa Esviere

Logiciel de gestion du materiel pour le tiers-lieu de l'Esviere (Fondacio Angers).

## Prerequis

- Node.js >= 20
- Docker et Docker Compose (pour la base de donnees en dev)

## Installation

```bash
# Cloner le repository
git clone https://github.com/fondacio-esviere/resa-esviere.git
cd resa-esviere

# Installer les dependances
npm install

# Copier la configuration
cp .env.example .env

# Demarrer PostgreSQL et MailHog
docker compose up -d

# Appliquer les migrations
npm run db:migrate -w packages/api

# Inserer les donnees de demo
npm run db:seed -w packages/api
```

## Developpement

```bash
# Compiler le package partage
npm run build:shared

# Demarrer le backend (port 3000)
npm run dev:api

# Demarrer le frontend (port 5173)
npm run dev:web
```

Le frontend redirige automatiquement les appels `/api` vers le backend.

## Emails en developpement

MailHog capture tous les emails envoyes. Interface web : http://localhost:8025

## Structure du projet

```
resa-esviere/
  packages/
    shared/     Types et schemas de validation partages
    api/        Backend Express + Prisma + PostgreSQL
    web/        Frontend React + Vite + Tailwind CSS
```

## Licence

MIT — voir [LICENSE](LICENSE)
