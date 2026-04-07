# Deploiement Fonda Resa sur Windows Server 2019 + Cloudflare Tunnel

## Architecture

```
Internet → Cloudflare Tunnel → Windows Server (192.168.1.9)
                                  ├── Node.js (port 3000) — API + Frontend
                                  └── PostgreSQL (port 5432) — Base de donnees
```

Acces public via : `https://resa.fondacio.fr` (ou autre sous-domaine)

---

## Etape 1 : Installer les prerequis sur le Windows Server

Se connecter au serveur via Bureau a distance (RDS) :
- Adresse : `81.255.81.57:17007`
- Login : `FONDACIOANJOU\m.akkaoui`

### 1.1 Installer Node.js 20

1. Telecharger Node.js 20 LTS depuis : https://nodejs.org/en/download
   - Choisir **Windows Installer (.msi)** — 64 bits
2. Lancer l'installeur, tout laisser par defaut
3. Verifier dans un **PowerShell** (en tant qu'administrateur) :
   ```powershell
   node --version
   # Doit afficher v20.x.x
   npm --version
   ```

### 1.2 Installer PostgreSQL 16

1. Telecharger depuis : https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
   - Choisir **Windows x86-64** — version 16.x
2. Lancer l'installeur :
   - Cocher : PostgreSQL Server, pgAdmin, Command Line Tools
   - **Mot de passe superuser** : choisir un mot de passe fort et le noter (ex: `FondaResa2026!`)
   - Port : laisser **5432**
   - Locale : French, France
3. Verifier dans PowerShell :
   ```powershell
   psql --version
   # Doit afficher psql (PostgreSQL) 16.x
   ```

### 1.3 Creer la base de donnees

Ouvrir **pgAdmin** (installe avec PostgreSQL) ou PowerShell :
```powershell
# Se connecter a PostgreSQL
psql -U postgres

# Dans le prompt psql :
CREATE USER resa WITH PASSWORD 'ChoisirUnMotDePasse';
CREATE DATABASE fonda_resa OWNER resa;
\q
```

### 1.4 Installer Git

1. Telecharger depuis : https://git-scm.com/download/win
2. Installer avec les options par defaut

---

## Etape 2 : Deployer l'application

### 2.1 Cloner le code

Ouvrir PowerShell et aller dans le repertoire partage :
```powershell
cd C:\cml
git clone https://github.com/akkaouim/fonda-resa.git
cd fonda-resa
```

### 2.2 Installer les dependances

```powershell
npm install
```

### 2.3 Configurer l'environnement

```powershell
copy .env.example .env
notepad .env
```

Modifier le fichier `.env` avec ces valeurs :
```
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://resa:ChoisirUnMotDePasse@localhost:5432/fonda_resa

# Generer des secrets aleatoires (coller le resultat de chaque commande)
# PowerShell : [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])
JWT_ACCESS_SECRET=<coller le resultat ici>
JWT_REFRESH_SECRET=<coller un 2e resultat ici>

SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_USER=site.esviere@fondacio.fr
SMTP_PASS=<mot de passe email OVH>
SMTP_FROM=Fonda Resa <site.esviere@fondacio.fr>

FRONTEND_URL=https://resa.fondacio.fr
UPLOAD_DIR=./uploads
```

### 2.4 Initialiser la base de donnees

```powershell
# Compiler le package partage
npm run build:shared

# Appliquer les migrations
npm run db:migrate -w packages/api

# Inserer les donnees de demo
npm run db:seed -w packages/api
```

### 2.5 Builder le frontend

```powershell
npm run build:web
```

### 2.6 Tester en local

```powershell
npm run dev:api
```

Ouvrir http://localhost:3000 dans le navigateur du serveur.
Se connecter avec `admin@esviere.fr` / `admin1234`.

Si ca marche, arreter avec Ctrl+C.

### 2.7 Installer comme service Windows (demarrage automatique)

On utilise **pm2** pour gerer le processus Node.js :

```powershell
# Installer pm2 globalement
npm install -g pm2
npm install -g pm2-windows-service

# Compiler le backend
npm run build:api

# Lancer via pm2
cd C:\cml\fonda-resa
pm2 start packages/api/dist/server.js --name fonda-resa

# Verifier que ca tourne
pm2 status

# Installer comme service Windows (demarrage automatique)
pm2-service-install
# Repondre "y" aux questions
pm2 save
```

L'app tourne maintenant en permanence sur le port 3000, meme apres un redemarrage du serveur.

---

## Etape 3 : Installer Cloudflare Tunnel

C'est ce qui rend l'app accessible depuis internet.

### 3.1 Creer un compte Cloudflare (gratuit)

1. Aller sur https://dash.cloudflare.com/sign-up
2. Creer un compte (ou se connecter si Fondacio en a deja un)

### 3.2 Ajouter le domaine a Cloudflare

1. Dans Cloudflare, cliquer **"Add a site"**
2. Entrer le domaine (ex: `fondacio.fr` ou `esviere-fondacio.fr`)
3. Choisir le plan **Free**
4. Cloudflare donne 2 serveurs DNS (ex: `ns1.cloudflare.com`, `ns2.cloudflare.com`)
5. **Sur OVH** : aller dans la gestion du domaine → Serveurs DNS → remplacer par ceux de Cloudflare
6. Attendre la propagation (quelques minutes a quelques heures)

> **Important** : cela transfere la gestion DNS a Cloudflare. Les emails et autres
> enregistrements DNS existants seront importes automatiquement par Cloudflare.
> Verifier que les enregistrements MX (emails) sont bien presents apres le transfert.

### 3.3 Installer cloudflared sur le Windows Server

1. Telecharger depuis : https://github.com/cloudflare/cloudflared/releases/latest
   - Fichier : `cloudflared-windows-amd64.msi`
2. Installer le .msi

3. Dans PowerShell (administrateur) :
```powershell
# Se connecter a Cloudflare
cloudflared tunnel login
# Un navigateur s'ouvre, se connecter et autoriser le domaine

# Creer le tunnel
cloudflared tunnel create fonda-resa
# Note le Tunnel ID affiche (ex: a1b2c3d4-e5f6-...)

# Creer la configuration
notepad C:\Users\m.akkaoui\.cloudflared\config.yml
```

4. Contenu du fichier `config.yml` :
```yaml
tunnel: <TUNNEL_ID>
credentials-file: C:\Users\m.akkaoui\.cloudflared\<TUNNEL_ID>.json

ingress:
  - hostname: resa.fondacio.fr
    service: http://localhost:3000
  - service: http_status:404
```

5. Creer l'enregistrement DNS :
```powershell
cloudflared tunnel route dns fonda-resa resa.fondacio.fr
```

6. Tester le tunnel :
```powershell
cloudflared tunnel run fonda-resa
```

7. Ouvrir https://resa.fondacio.fr dans un navigateur — l'app doit s'afficher !

### 3.4 Installer le tunnel comme service Windows

```powershell
cloudflared service install
```

Le tunnel demarre automatiquement avec Windows. L'app est accessible en permanence.

---

## Etape 4 : Verification finale

- [ ] http://localhost:3000 fonctionne sur le serveur
- [ ] https://resa.fondacio.fr est accessible depuis internet
- [ ] Login avec admin@esviere.fr / admin1234
- [ ] Creer un vrai compte admin avec un vrai email
- [ ] Changer le mot de passe du compte de demo
- [ ] Verifier que les emails arrivent (creer un utilisateur)

---

## Maintenance

### Mettre a jour l'application

```powershell
cd C:\cml\fonda-resa
git pull
npm install
npm run build:shared
npm run build:web
npm run build:api
cd packages\api
npx prisma migrate deploy
cd ..\..
pm2 restart fonda-resa
```

### Voir les logs

```powershell
pm2 logs fonda-resa
```

### Redemarrer l'app

```powershell
pm2 restart fonda-resa
```

### Sauvegarder la base de donnees

```powershell
pg_dump -U resa fonda_resa > C:\cml\backup_fonda_resa.sql
```
