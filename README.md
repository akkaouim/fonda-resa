# Resa Esviere

Logiciel de gestion du materiel pour le tiers-lieu de l'Esviere (Fondacio Angers).

Permet a une trentaine de personnes habilitees de consulter l'inventaire du materiel audiovisuel et technique, de reserver du materiel en ligne, et aux administrateurs de suivre les entrees/sorties.

## Fonctionnalites

- **Inventaire** : catalogue complet avec categories, sous-categories, localisations, etats, photos, import CSV
- **Reservations** : formulaire multi-items avec gestion des quantites, validation du perimetre d'utilisation, workflow d'approbation admin, notifications par email
- **Entrees/sorties** : suivi des mouvements physiques, liaison avec les reservations, gestion des consommables
- **Gestion des comptes** : creation par les admins uniquement, roles membre/admin, reset de mot de passe
- **Tableaux de bord** : vue membre (reservations en cours) et admin (alertes, statistiques)

## Stack technique

| Composant | Technologie |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Base de donnees | PostgreSQL + Prisma ORM |
| Authentification | JWT (access + refresh token) |
| Emails | Nodemailer (SMTP OVH) |
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
# Compiler le package partage (necessaire au premier lancement)
npm run build:shared

# Demarrer le backend (port 3000)
npm run dev:api

# Dans un autre terminal, demarrer le frontend (port 5173)
npm run dev:web
```

Le frontend redirige automatiquement les appels `/api` vers le backend.

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
```

## Structure du projet

```
fonda-resa/
  .github/workflows/     CI (lint, typecheck, tests) + deploiement
  packages/
    shared/              Types TypeScript + schemas Zod partages
    api/                 Backend Express + Prisma + PostgreSQL
      prisma/            Schema, migrations, seed
      src/
        config/          Env, database, logger
        middleware/       Auth JWT, validation, error handler
        modules/         Auth, users, categories, localisations,
                         items, reservations, mouvements, dashboard
        services/        Email, audit
    web/                 Frontend React + Vite + Tailwind CSS
      src/
        components/      Layout, admin forms, import wizard
        hooks/           TanStack Query hooks (auth, items, etc.)
        pages/           Pages membre et admin
        stores/          Zustand (auth)
        lib/             Client API avec refresh token
  docker-compose.yml     Dev local : PostgreSQL + MailHog
  .env.example           Variables d'environnement documentees
```

## Deploiement sur VPS (Gandi)

### 1. Preparer le serveur

```bash
# Sur le VPS (Ubuntu 22.04+)
sudo apt update && sudo apt install -y nginx postgresql

# Installer Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Installer pm2
sudo npm install -g pm2
```

### 2. Configurer PostgreSQL

```bash
sudo -u postgres createuser resa
sudo -u postgres createdb resa_esviere -O resa
sudo -u postgres psql -c "ALTER USER resa PASSWORD 'votre_mot_de_passe_db';"
```

### 3. Configurer Nginx

```nginx
# /etc/nginx/sites-available/resa-esviere
server {
    listen 80;
    server_name resa.esviere-fondacio.fr;

    # Frontend (fichiers statiques)
    location / {
        root /var/www/resa-esviere/packages/web/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Photos uploadees
    location /uploads/ {
        alias /var/www/resa-esviere/uploads/;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/resa-esviere /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4. SSL avec Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d resa.esviere-fondacio.fr
```

### 5. Configurer le `.env` de production

```bash
# Sur le serveur, dans /var/www/resa-esviere/.env
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://resa:votre_mot_de_passe_db@localhost:5432/resa_esviere"
JWT_ACCESS_SECRET=<generer: openssl rand -base64 48>
JWT_REFRESH_SECRET=<generer: openssl rand -base64 48>
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_USER=site.esviere@fondacio.fr
SMTP_PASS=<mot de passe email OVH>
SMTP_FROM="Resa Esviere <site.esviere@fondacio.fr>"
FRONTEND_URL=https://resa.esviere-fondacio.fr
UPLOAD_DIR=./uploads
```

### 6. Configurer GitHub Actions (deploiement automatique)

Dans les **Settings > Secrets** du repo GitHub, ajouter :

| Secret | Valeur |
|---|---|
| `SSH_PRIVATE_KEY` | Cle privee SSH pour se connecter au VPS |
| `REMOTE_HOST` | IP ou domaine du VPS |
| `REMOTE_USER` | Utilisateur SSH (ex: `deploy`) |
| `REMOTE_PATH` | Chemin sur le serveur (ex: `/var/www/resa-esviere`) |

Generer la cle SSH de deploiement :
```bash
ssh-keygen -t ed25519 -C "deploy@resa-esviere" -f deploy_key
# Ajouter deploy_key.pub dans ~/.ssh/authorized_keys sur le serveur
# Copier le contenu de deploy_key dans le secret SSH_PRIVATE_KEY
```

Chaque push sur `main` declenche automatiquement : tests → build → deploiement.

## Variables d'environnement

Voir [`.env.example`](.env.example) pour la liste complete avec descriptions.

## Licence

MIT — voir [LICENSE](LICENSE)
