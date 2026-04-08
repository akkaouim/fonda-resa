# Deploiement Fonda Resa sur Windows Server + Cloudflare Tunnel

## Architecture

```
Internet → Cloudflare Tunnel → Serveur RDS Windows (81.255.81.57)
                                  ├── Node.js (port 3000) — API + Frontend
                                  └── PostgreSQL (port 5432) — Base de donnees

Le code source est sur le serveur d'applications (192.168.1.9)
accessible via le partage reseau \\192.168.1.9\cml\fonda-resa
monte en tant que lecteur Z: sur le RDS.
```

Acces public via : `https://resa.fondacio.fr` (ou autre sous-domaine)

---

## Points d'attention importants

Lecons tirees de l'installation initiale :

1. **Ne jamais redemarrer le serveur pendant les heures de travail** — d'autres services (comptabilite, EBP Paie) tournent sur le meme serveur.
2. **Les installeurs systeme (.msi) necessitent les droits admin** — Node.js et PostgreSQL doivent etre installes par l'administrateur ou avec un compte ayant les droits admin sur C:.
3. **Les lecteurs reseau et npm ne font pas bon menage** — npm utilise des liens symboliques qui ne fonctionnent pas sur les partages reseau Windows. Le code est sur Z: mais certaines operations (migrations Prisma) doivent etre lancees depuis C:.
4. **Les mots de passe PostgreSQL doivent etre simples** — eviter les caracteres speciaux (`!`, `@`, `*`) dans les mots de passe car ils causent des problemes d'encodage dans les URLs de connexion.
5. **Fermer et rouvrir PowerShell** apres l'installation de Node.js/PostgreSQL pour que le PATH soit mis a jour.
6. **`psql` n'est pas dans le PATH par defaut** — utiliser le chemin complet ou pgAdmin.

---

## Etape 1 : Installer les prerequis

Se connecter au serveur via Bureau a distance (RDS) :
- Adresse : `81.255.81.57:17007`
- Login : `FONDACIOANJOU\m.akkaoui`

> **Important** : les installations suivantes doivent etre faites par l'administrateur
> ou avec un compte ayant les droits admin sur le disque C:.
> Planifier les installations **en dehors des heures de travail** (risque de redemarrage).

### 1.1 Installer Node.js

1. Telecharger Node.js LTS depuis : https://nodejs.org/en/download
   - Choisir **Windows Installer (.msi)** — 64 bits
2. **Clic droit → Executer en tant qu'administrateur**
3. Laisser le chemin par defaut (`C:\Program Files\nodejs\`)
4. **Fermer et rouvrir PowerShell** apres l'installation
5. Verifier :
   ```powershell
   node --version
   npm --version
   ```

### 1.2 Installer PostgreSQL

1. Telecharger depuis : https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
   - Choisir **Windows x86-64** — derniere version
2. **Clic droit → Executer en tant qu'administrateur**
3. Options :
   - Cocher : PostgreSQL Server, pgAdmin, Command Line Tools
   - **Mot de passe superuser : choisir un mot de passe SANS caracteres speciaux** (ex: `postgres2026`)
   - Port : **5432**
4. **Fermer et rouvrir PowerShell** apres l'installation

> **Attention** : l'installation de PostgreSQL peut provoquer un redemarrage
> du serveur (composant Visual C++ Redistributable). Ne pas installer
> pendant les heures de travail.

### 1.3 Creer la base de donnees via pgAdmin

`psql` n'est pas dans le PATH par defaut. Utiliser **pgAdmin** (menu Demarrer) :

1. Ouvrir pgAdmin, se connecter au serveur PostgreSQL (mot de passe superuser)
2. **Creer l'utilisateur** :
   - Clic droit sur **Login/Group Roles** → **Create** → **Login/Group Role**
   - General : Name = `resa`
   - Definition : Password = `fondaresa2026` (pas de caracteres speciaux !)
   - Privileges : Can login = **Yes**
   - **Save**
3. **Creer la base** :
   - Clic droit sur **Databases** → **Create** → **Database**
   - Database = `fonda_resa`
   - Owner = `resa`
   - **Save**

### 1.4 Installer Git

1. Telecharger depuis : https://git-scm.com/download/win
2. Installer avec les options par defaut

---

## Etape 2 : Deployer l'application

### 2.1 Monter le lecteur reseau et cloner le code

```powershell
# Monter le partage reseau si pas deja fait
net use Z: \\192.168.1.9\cml

# Cloner le projet
cd Z:\
git clone https://github.com/akkaouim/fonda-resa.git
cd Z:\fonda-resa
```

### 2.2 Installer les dependances

```powershell
npm install
```

> Les warnings "deprecated" et "vulnerability" sont normaux et n'empechent
> rien de fonctionner.

### 2.3 Configurer l'environnement

Creer le fichier `.env` **a deux endroits** (la racine et packages/api) :

```powershell
copy .env.example .env
notepad .env
```

Remplir avec :
```
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://resa:fondaresa2026@127.0.0.1:5432/fonda_resa

JWT_ACCESS_SECRET=<generer avec la commande ci-dessous>
JWT_REFRESH_SECRET=<generer une 2e fois>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=noreply@fondacio.fr
SMTP_PASS=
SMTP_FROM=Fonda Resa <noreply@fondacio.fr>

FRONTEND_URL=http://localhost:3000
UPLOAD_DIR=./uploads
```

> **Important** : utiliser `127.0.0.1` au lieu de `localhost` dans DATABASE_URL.
> Ne pas mettre de caracteres speciaux dans le mot de passe PostgreSQL.

Pour generer les secrets JWT, lancer cette commande **deux fois** dans PowerShell :
```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])
```

Copier le fichier `.env` aussi dans `packages/api/` (Prisma en a besoin) :
```powershell
Set-Content -Path "Z:\fonda-resa\packages\api\.env" -Value 'DATABASE_URL=postgresql://resa:fondaresa2026@127.0.0.1:5432/fonda_resa'
```

### 2.4 Appliquer les migrations de base de donnees

Les migrations Prisma ne fonctionnent pas depuis un lecteur reseau.
Il faut les lancer depuis le **disque local C:** avec un dossier temporaire :

```powershell
# Creer un dossier temporaire sur C:
cmd /c "mkdir C:\temp-prisma"

# Copier le schema et les migrations
cmd /c "xcopy Z:\fonda-resa\packages\api\prisma C:\temp-prisma\prisma\ /E /Y"

# Installer Prisma dans le dossier temporaire
cd C:\temp-prisma
npm init -y
npm install prisma@6.19.3 @prisma/client@6.19.3 @prisma/engines@6.19.3

# Lancer les migrations
$env:DATABASE_URL='postgresql://resa:fondaresa2026@127.0.0.1:5432/fonda_resa'
npx prisma migrate deploy --schema prisma/schema.prisma

# Nettoyer le dossier temporaire
cd Z:\fonda-resa
cmd /c "rmdir C:\temp-prisma /s /q"
```

### 2.5 Generer le client Prisma et inserer les donnees de demo

```powershell
cd Z:\fonda-resa\packages\api
$env:DATABASE_URL='postgresql://resa:fondaresa2026@127.0.0.1:5432/fonda_resa'
npx prisma generate
npx tsx prisma/seed.ts
```

Resultat attendu :
```
Admin: admin@esviere.fr / admin1234
Membre: membre@esviere.fr / membre1234
6 localisations creees
13 categories creees
42 items crees
Seeding complete!
```

### 2.6 Builder le frontend et le backend

```powershell
cd Z:\fonda-resa
npm run build:web
npm run build:api
```

### 2.7 Tester en local

```powershell
$env:DATABASE_URL='postgresql://resa:fondaresa2026@127.0.0.1:5432/fonda_resa'
node packages/api/dist/server.js
```

Ouvrir http://localhost:3000 dans le navigateur du serveur.
Se connecter avec `admin@esviere.fr` / `admin1234`.

Si ca marche, arreter avec **Ctrl+C**.

### 2.8 Installer comme service Windows (demarrage automatique)

```powershell
# Installer pm2 globalement
npm install -g pm2
npm install -g pm2-windows-service

# Lancer via pm2 (avec la variable DATABASE_URL)
cd Z:\fonda-resa
pm2 start packages/api/dist/server.js --name fonda-resa --env DATABASE_URL='postgresql://resa:fondaresa2026@127.0.0.1:5432/fonda_resa'

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
2. Installer le .msi (**en tant qu'administrateur**)

3. Dans PowerShell :
```powershell
# Se connecter a Cloudflare
cloudflared tunnel login
# Un navigateur s'ouvre, se connecter et autoriser le domaine

# Creer le tunnel
cloudflared tunnel create fonda-resa
# Noter le Tunnel ID affiche (ex: a1b2c3d4-e5f6-...)

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
cd Z:\fonda-resa
git pull
npm install
npm run build:web
npm run build:api

# Si des migrations ont ete ajoutees :
cmd /c "mkdir C:\temp-prisma"
cmd /c "xcopy Z:\fonda-resa\packages\api\prisma C:\temp-prisma\prisma\ /E /Y"
cd C:\temp-prisma
npm init -y
npm install prisma@6.19.3 @prisma/client@6.19.3 @prisma/engines@6.19.3
$env:DATABASE_URL='postgresql://resa:fondaresa2026@127.0.0.1:5432/fonda_resa'
npx prisma migrate deploy --schema prisma/schema.prisma
cd Z:\fonda-resa
cmd /c "rmdir C:\temp-prisma /s /q"

# Regenerer le client Prisma
cd packages\api
npx prisma generate
cd Z:\fonda-resa

# Redemarrer l'app
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
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U resa fonda_resa > Z:\fonda-resa\backup_fonda_resa.sql
```

---

## Depannage

### "psql n'est pas reconnu"
Utiliser le chemin complet :
```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres
```

### "node n'est pas reconnu" apres installation
Fermer et rouvrir PowerShell pour recharger le PATH.

### Erreur d'authentification PostgreSQL avec Prisma
- Verifier que le mot de passe ne contient pas de caracteres speciaux
- Utiliser `127.0.0.1` au lieu de `localhost`
- Les migrations doivent etre lancees depuis C: (pas depuis le lecteur reseau Z:)

### "Cannot find module @resa-esviere/shared"
Ce probleme est resolu — le projet n'utilise plus de workspaces npm.
Si l'erreur persiste, faire `npm install` depuis `Z:\fonda-resa`.

### npm ne fonctionne pas depuis le lecteur reseau
Les chemins UNC (`\\192.168.1.9\...`) ne sont pas supportes par npm.
Toujours utiliser un lecteur mappe (`Z:\fonda-resa`).
Si Z: n'est pas disponible :
```powershell
net use Z: \\192.168.1.9\cml
```
