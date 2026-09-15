# Photos multiples par item — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à un item de porter jusqu'à six photos au lieu d'une seule.

**Architecture:** `Item.photoUrl` devient `Item.photoUrls String[]`, l'ordre du tableau faisant office d'ordre d'affichage et son premier élément d'image principale. Deux routes remplacent l'upload unique : un ajout multiple qui refuse au-delà du budget, et une suppression qui retire l'URL du tableau et efface le fichier du disque. Le formulaire modifie une galerie localement et n'envoie rien avant l'enregistrement.

**Tech Stack:** Node 20, Express, Prisma 6 + PostgreSQL, multer, React 19 + Vite, TanStack Query, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-09-15-photos-multiples-design.md`

## Global Constraints

- Maximum six photos par item (`MAX_PHOTOS_PER_ITEM = 6`).
- Maximum 10 Mo par fichier (`MAX_PHOTO_BYTES`, déjà en place).
- Formats acceptés : `.jpg`, `.jpeg`, `.png`, `.webp`. HEIC refusé avec un message dédié.
- Les messages destinés à l'utilisateur sont en français **sans accents**, comme tout le reste de l'API (`'Localisation supprimee'`, `'Acces refuse'`).
- Les commentaires de code et les messages de commit sont en anglais, comme le reste du dépôt.
- Aucun `any` dans les fichiers créés : `@typescript-eslint/no-explicit-any` est actif.
- Vérifier le typecheck web avec `npx tsc --noEmit -p packages/web/tsconfig.app.json`. **`npm run typecheck -w packages/web` ne vérifie rien** — son tsconfig est un fichier solution avec `"files": []`.
- Un push sur `main` déploie en production et exécute `prisma migrate deploy` automatiquement. Ne pousser la tâche 1 qu'après avoir vérifié la migration sur une base locale.

---

### Task 1: Modèle de données et migration

**Files:**
- Modify: `packages/api/prisma/schema.prisma:131`
- Create: `packages/api/prisma/migrations/<timestamp>_item_photo_urls/migration.sql`
- Modify: `packages/api/src/modules/items/items.service.ts:92`
- Modify: `packages/api/src/shared/types/item.ts:18`
- Modify: `packages/web/src/shared/types/item.ts:18`
- Modify: `packages/api/prisma/seed-photos.ts:123-129`, `seed-photos-fix.ts:63`, `clean-photos.ts:14-20`

**Interfaces:**
- Consumes: rien.
- Produces: le champ Prisma `photoUrls: string[]` sur `Item`, et la propriété `photoUrls: string[]` sur l'interface TypeScript `Item` des deux packages. Toutes les tâches suivantes en dépendent.

- [ ] **Step 1: Démarrer la base locale**

Docker Desktop doit tourner. Puis :

```bash
cd "/Users/akkaouim/Documents/Resa Fondacio/fonda-resa"
docker compose up -d
npm run db:migrate -w packages/api
npm run db:seed -w packages/api
```

- [ ] **Step 2: Créer une ligne témoin avec une photo**

Cette ligne sert à prouver que la migration ne perd pas de données. Elle doit être **inactive**, car le backfill doit couvrir aussi les items soft-deleted.

```bash
docker compose exec -T postgres psql -U resa -d resa_esviere -c \
  "UPDATE items SET photo_url = '/uploads/photos/temoin.jpg', actif = false WHERE id = (SELECT MIN(id) FROM items);"

docker compose exec -T postgres psql -U resa -d resa_esviere -c \
  "SELECT id, photo_url, actif FROM items WHERE photo_url IS NOT NULL;"
```

Noter l'`id` renvoyé, il sert à l'étape 6.

- [ ] **Step 3: Modifier le schéma Prisma**

Dans `packages/api/prisma/schema.prisma`, remplacer la ligne `photoUrl` du modèle `Item` :

```prisma
  photoUrls             String[]             @map("photo_urls")
```

La ligne `photoUrl String? @map("photo_url")` disparaît. Prisma donne `[]` par défaut aux colonnes tableau, aucun `@default` n'est nécessaire.

- [ ] **Step 4: Écrire la migration à la main**

Créer le dossier et le fichier. **Ne pas lancer `prisma migrate dev`** : il génèrerait un `DROP COLUMN` suivi d'un `ADD COLUMN`, ce qui effacerait toutes les photos existantes.

```bash
mkdir -p packages/api/prisma/migrations/20260915120000_item_photo_urls
```

Contenu de `packages/api/prisma/migrations/20260915120000_item_photo_urls/migration.sql` :

```sql
-- Add the array column first, backfill from the single column, and only then
-- drop it. Generating this migration automatically would drop and re-add,
-- losing every existing photo.
ALTER TABLE "items" ADD COLUMN "photo_urls" TEXT[] NOT NULL DEFAULT '{}';

-- No filter on `actif`: a soft-deleted item that is later restored must keep
-- its photo.
UPDATE "items" SET "photo_urls" = ARRAY["photo_url"] WHERE "photo_url" IS NOT NULL;

ALTER TABLE "items" DROP COLUMN "photo_url";
```

- [ ] **Step 5: Appliquer la migration**

```bash
npm run db:migrate:deploy -w packages/api
npx prisma generate --schema=packages/api/prisma/schema.prisma
```

Attendu : `1 migration applied`.

- [ ] **Step 6: Vérifier que la photo témoin a survécu**

```bash
docker compose exec -T postgres psql -U resa -d resa_esviere -c \
  "SELECT id, photo_urls, actif FROM items WHERE cardinality(photo_urls) > 0;"
```

Attendu : la ligne notée à l'étape 2, avec `photo_urls` valant `{/uploads/photos/temoin.jpg}` et `actif` à `f`. Si le tableau est vide, la migration a perdu la donnée — corriger avant d'aller plus loin.

- [ ] **Step 7: Retirer photoUrl du service de création**

Dans `packages/api/src/modules/items/items.service.ts`, supprimer entièrement la ligne :

```ts
      photoUrl: data.photoUrl,
```

`createItemSchema` ne contient pas ce champ, il valait donc toujours `undefined`. Les photos ne s'écrivent que par les routes dédiées.

- [ ] **Step 8: Mettre à jour les deux interfaces Item**

Dans `packages/api/src/shared/types/item.ts` **et** `packages/web/src/shared/types/item.ts`, remplacer :

```ts
  photoUrl: string | null;
```

par :

```ts
  photoUrls: string[];
```

Les deux fichiers sont des copies l'une de l'autre et doivent rester identiques.

- [ ] **Step 9: Mettre à jour les trois scripts prisma**

Ces scripts ne sont ni compilés ni testés (`tsconfig.json` a `"include": ["src"]`), mais ils planteraient à l'exécution.

Dans `packages/api/prisma/seed-photos.ts`, remplacer `data: { photoUrl }` par :

```ts
        data: { photoUrls: [photoUrl] },
```

Dans `packages/api/prisma/seed-photos-fix.ts`, remplacer `data: { photoUrl: ... }` par :

```ts
      await prisma.item.update({ where: { id: item.id }, data: { photoUrls: [`/uploads/photos/${filename}`] } });
```

Dans `packages/api/prisma/clean-photos.ts`, remplacer le bloc qui lit et vide `photoUrl` par :

```ts
  const items = await prisma.item.findMany({ where: { NOT: { photoUrls: { isEmpty: true } } } });

  for (const item of items) {
    const kept = item.photoUrls.filter((url) => {
      const filename = url.replace('/uploads/photos/', '');
      return fs.existsSync(path.join(uploadDir, filename));
    });
    if (kept.length !== item.photoUrls.length) {
      await prisma.item.update({ where: { id: item.id }, data: { photoUrls: kept } });
    }
  }
```

- [ ] **Step 10: Vérifier la compilation**

```bash
npx tsc --noEmit -p packages/api/tsconfig.json
npx tsc --noEmit -p packages/web/tsconfig.app.json
npm run test -w packages/api
npm run test -w packages/web
```

Attendu : aucune erreur. Le test `InventairePage.test.tsx` référence `photoUrl: null` dans sa constante `ITEM` ; le remplacer par `photoUrls: []`.

- [ ] **Step 11: Commit**

```bash
git add packages/api/prisma packages/api/src packages/web/src/shared/types/item.ts packages/web/src/pages/admin/InventairePage.test.tsx
git commit -m "Replace Item.photoUrl with a photoUrls array

The migration is hand-written: an auto-generated one would drop and re-add the
column, losing every existing photo. It adds the array, backfills from the old
column without filtering on actif, and only then drops it."
```

---

### Task 2: Budget de photos (fonction pure)

**Files:**
- Modify: `packages/api/src/shared/uploads.ts`
- Test: `packages/api/src/__tests__/uploads.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `MAX_PHOTOS_PER_ITEM: number` (vaut 6) et `checkPhotoBudget(existantes: number, ajoutees: number): { ok: boolean; message?: string }`. Utilisés par la tâche 3.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à la fin de `packages/api/src/__tests__/uploads.test.ts`, et compléter la ligne d'import existante pour y ajouter `MAX_PHOTOS_PER_ITEM` et `checkPhotoBudget` :

```ts
describe('checkPhotoBudget', () => {
  it('allows filling the budget exactly', () => {
    expect(checkPhotoBudget(0, MAX_PHOTOS_PER_ITEM).ok).toBe(true);
  });

  it('allows adding to a partly filled item', () => {
    expect(checkPhotoBudget(4, 2).ok).toBe(true);
  });

  it('refuses going over the budget', () => {
    const result = checkPhotoBudget(5, 2);
    expect(result.ok).toBe(false);
  });

  it('states the limit and what is left', () => {
    const result = checkPhotoBudget(5, 2);
    expect(result.message).toContain('6');
    expect(result.message).toContain('1');
  });

  it('refuses when the item is already full', () => {
    expect(checkPhotoBudget(MAX_PHOTOS_PER_ITEM, 1).ok).toBe(false);
  });

  it('allows adding nothing to a full item', () => {
    expect(checkPhotoBudget(MAX_PHOTOS_PER_ITEM, 0).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier l'échec**

```bash
npm run test -w packages/api
```

Attendu : ÉCHEC sur `checkPhotoBudget is not a function`.

- [ ] **Step 3: Écrire l'implémentation minimale**

Ajouter à la fin de `packages/api/src/shared/uploads.ts` :

```ts
/** A handful of angles is what the gallery is for; storage is a VPS volume. */
export const MAX_PHOTOS_PER_ITEM = 6;

/**
 * Decide whether an upload fits in what the item has left.
 *
 * Reported as "places restantes" rather than a bare refusal, because the admin
 * selects several files at once and needs to know how many to drop.
 */
export function checkPhotoBudget(
  existantes: number,
  ajoutees: number
): { ok: boolean; message?: string } {
  if (existantes + ajoutees <= MAX_PHOTOS_PER_ITEM) {
    return { ok: true };
  }

  const restantes = Math.max(0, MAX_PHOTOS_PER_ITEM - existantes);
  return {
    ok: false,
    message: `Un item ne peut pas depasser ${MAX_PHOTOS_PER_ITEM} photos. Il reste ${restantes} place(s).`,
  };
}
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

```bash
npm run test -w packages/api
```

Attendu : tous verts.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/shared/uploads.ts packages/api/src/__tests__/uploads.test.ts
git commit -m "Add the six-photo budget rule"
```

---

### Task 3: Routes d'ajout et de suppression de photos

**Files:**
- Modify: `packages/api/src/shared/uploads.ts`
- Modify: `packages/api/src/modules/items/items.routes.ts:86-95`
- Test: `packages/api/src/__tests__/uploads.test.ts`

**Interfaces:**
- Consumes: `MAX_PHOTOS_PER_ITEM`, `checkPhotoBudget` (tâche 2) ; `Item.photoUrls` (tâche 1).
- Produces: `photoFilenameFromUrl(url: string): string | null` et `discardUploadedFiles(files: { path: string }[], unlink: (path: string) => Promise<void>): Promise<void>`. Les routes `POST /api/items/:id/photos` et `DELETE /api/items/:id/photos`, consommées par la tâche 4.

- [ ] **Step 1: Écrire les tests qui échouent pour la validation d'URL**

Ajouter à `packages/api/src/__tests__/uploads.test.ts`, en ajoutant `photoFilenameFromUrl` à l'import :

```ts
describe('photoFilenameFromUrl', () => {
  it('returns the filename of a photo we served', () => {
    expect(photoFilenameFromUrl('/uploads/photos/1757890-ab12.jpg')).toBe('1757890-ab12.jpg');
  });

  it('refuses a path that escapes the photo directory', () => {
    expect(photoFilenameFromUrl('/uploads/photos/../../.env')).toBeNull();
  });

  it('refuses a nested path', () => {
    expect(photoFilenameFromUrl('/uploads/photos/sub/photo.jpg')).toBeNull();
  });

  it('refuses a URL served from anywhere else', () => {
    expect(photoFilenameFromUrl('/etc/passwd')).toBeNull();
  });

  it('refuses an empty filename', () => {
    expect(photoFilenameFromUrl('/uploads/photos/')).toBeNull();
  });

  it('refuses a backslash, which Windows would treat as a separator', () => {
    expect(photoFilenameFromUrl('/uploads/photos/..\\secret')).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier l'échec**

```bash
npm run test -w packages/api
```

Attendu : ÉCHEC sur `photoFilenameFromUrl is not a function`.

- [ ] **Step 3: Écrire l'implémentation minimale**

Ajouter à la fin de `packages/api/src/shared/uploads.ts` :

```ts
export const PHOTO_URL_PREFIX = '/uploads/photos/';

/**
 * Extract the on-disk filename a photo URL refers to, or null if the URL is
 * not one we served.
 *
 * The URL to delete comes from the client, so without this check the delete
 * route would unlink any file the process can reach.
 */
export function photoFilenameFromUrl(url: string): string | null {
  if (!url.startsWith(PHOTO_URL_PREFIX)) return null;

  const filename = url.slice(PHOTO_URL_PREFIX.length);
  if (!filename) return null;
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) return null;

  return filename;
}
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

```bash
npm run test -w packages/api
```

Attendu : tous verts.

- [ ] **Step 5: Écrire les tests qui échouent pour le nettoyage**

Le nettoyage reçoit sa fonction d'effacement en paramètre : c'est ce qui le rend
vérifiable sans disque ni serveur, le projet n'ayant pas d'outillage de test
d'intégration.

```ts
describe('discardUploadedFiles', () => {
  it('unlinks every file it was given', async () => {
    const erased: string[] = [];

    await discardUploadedFiles(
      [{ path: '/tmp/a.jpg' }, { path: '/tmp/b.jpg' }],
      async (p) => { erased.push(p); }
    );

    expect(erased).toEqual(['/tmp/a.jpg', '/tmp/b.jpg']);
  });

  it('keeps erasing the others when one file is already gone', async () => {
    const erased: string[] = [];

    await discardUploadedFiles(
      [{ path: '/tmp/a.jpg' }, { path: '/tmp/b.jpg' }],
      async (p) => {
        if (p === '/tmp/a.jpg') throw new Error('ENOENT');
        erased.push(p);
      }
    );

    expect(erased).toEqual(['/tmp/b.jpg']);
  });

  it('does nothing when there is nothing to discard', async () => {
    await expect(discardUploadedFiles([], async () => { throw new Error('should not run'); })).resolves.toBeUndefined();
  });
});
```

Ajouter `discardUploadedFiles` à l'import du fichier de test.

- [ ] **Step 6: Lancer les tests et vérifier l'échec**

```bash
npm run test -w packages/api
```

Attendu : ÉCHEC sur `discardUploadedFiles is not a function`.

- [ ] **Step 7: Écrire l'implémentation minimale**

Ajouter à la fin de `packages/api/src/shared/uploads.ts` :

```ts
/**
 * Erase files multer already wrote when the request is going to be refused.
 *
 * multer writes to disk while parsing, so a refusal that skipped this would
 * leave behind exactly the orphans the photo routes exist to avoid. The unlink
 * is injected so this rule can be tested without touching a filesystem.
 */
export async function discardUploadedFiles(
  files: { path: string }[],
  unlink: (path: string) => Promise<void>
): Promise<void> {
  await Promise.all(
    files.map((file) => unlink(file.path).catch(() => { /* already gone */ }))
  );
}
```

- [ ] **Step 8: Lancer les tests et vérifier qu'ils passent**

```bash
npm run test -w packages/api
```

Attendu : tous verts.

- [ ] **Step 9: Remplacer la route d'upload**

Dans `packages/api/src/modules/items/items.routes.ts`, supprimer entièrement le bloc `router.post('/:id/photo', ...)` (lignes 86 à 95) et le remplacer par :

```ts
// Add photos (admin). multer writes the files to disk while parsing, before
// this handler runs, so anything refused here must be unlinked by hand.
router.post('/:id/photos', authenticate, authorize(Role.ADMIN), upload.array('photos', MAX_PHOTOS_PER_ITEM), asyncHandler(async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    throw new AppError(400, 'NO_FILE', 'Aucun fichier envoye');
  }

  const discard = () => discardUploadedFiles(files, (p) => fs.promises.unlink(p));

  const id = Number(req.params.id);
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    await discard();
    throw new AppError(404, 'ITEM_NOT_FOUND', 'Item introuvable');
  }

  const budget = checkPhotoBudget(item.photoUrls.length, files.length);
  if (!budget.ok) {
    await discard();
    throw new AppError(409, 'PHOTO_BUDGET_EXCEEDED', budget.message!);
  }

  const added = files.map((file) => `${PHOTO_URL_PREFIX}${file.filename}`);
  const updated = await itemsService.updateItem(id, { photoUrls: [...item.photoUrls, ...added] }, req.user!.sub);
  res.json({ success: true, data: updated });
}));

// Remove one photo (admin), from the item and from disk.
router.delete('/:id/photos', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    throw new AppError(400, 'NO_URL', 'Aucune photo indiquee');
  }

  const id = Number(req.params.id);
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    throw new AppError(404, 'ITEM_NOT_FOUND', 'Item introuvable');
  }
  // Only a URL this item actually holds may be deleted.
  if (!item.photoUrls.includes(url)) {
    throw new AppError(404, 'PHOTO_NOT_FOUND', 'Photo introuvable sur cet item');
  }

  const filename = photoFilenameFromUrl(url);
  if (filename) {
    await fs.promises.unlink(path.join(env.UPLOAD_DIR, 'photos', filename)).catch(() => { /* already gone */ });
  }

  const updated = await itemsService.updateItem(
    id,
    { photoUrls: item.photoUrls.filter((u) => u !== url) },
    req.user!.sub
  );
  res.json({ success: true, data: updated });
}));
```

- [ ] **Step 10: Compléter les imports**

En haut de `packages/api/src/modules/items/items.routes.ts`, ajouter à la ligne d'import de `uploads.js` :

```ts
import { MAX_PHOTO_BYTES, MAX_PHOTOS_PER_ITEM, checkPhotoBudget, photoFilenameFromUrl, discardUploadedFiles, PHOTO_URL_PREFIX } from '../../shared/uploads.js';
```

et ajouter l'accès direct à Prisma, absent de ce fichier :

```ts
import { prisma } from '../../config/database.js';
```

`fs`, `path` et `env` sont déjà importés en haut du fichier.

- [ ] **Step 11: Vérifier la compilation et les tests**

```bash
npx tsc --noEmit -p packages/api/tsconfig.json
npm run test -w packages/api
```

Attendu : aucune erreur, tous les tests verts. `updateItem(id, data: Record<string, any>, adminId)` accepte déjà un objet libre, aucune modification de sa signature n'est nécessaire.

- [ ] **Step 12: Commit**

```bash
git add packages/api/src
git commit -m "Replace the single photo upload with add and remove routes

A refused upload unlinks what multer already wrote, and a delete only accepts
a URL the item actually holds, resolved through photoFilenameFromUrl so a
crafted path cannot reach outside the photo directory."
```

---

### Task 4: Galerie dans le formulaire d'item

**Files:**
- Modify: `packages/web/src/lib/photo.ts`
- Test: `packages/web/src/lib/photo.test.ts`
- Modify: `packages/web/src/components/admin/ItemForm.tsx:59-120, 133-162`
- Modify: `packages/web/src/pages/admin/InventairePage.tsx:26-48`
- Test: `packages/web/src/components/admin/ItemForm.test.tsx`

**Interfaces:**
- Consumes: les routes de la tâche 3 ; `validatePhotoFile` et `MAX_PHOTO_BYTES` déjà présents dans `packages/web/src/lib/photo.ts`.
- Produces: `MAX_PHOTOS_PER_ITEM: number` et `syncItemPhotos(itemId: number, removedUrls: string[], addedFiles: File[]): Promise<void>` exportés depuis `packages/web/src/lib/photo.ts`. `ItemForm` passe désormais `_pendingPhotos: File[]` et `_removedPhotoUrls: string[]` à `onSave`.

- [ ] **Step 1: Écrire les tests qui échouent pour la synchronisation**

Ajouter en tête de `packages/web/src/lib/photo.test.ts` le mock du réseau, puis le bloc de tests :

```ts
vi.mock('./api', () => ({
  api: { post: vi.fn(), delete: vi.fn() },
}));
```

et à la fin du fichier :

```ts
describe('syncItemPhotos', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: {} } });
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true, data: {} } });
  });

  it('deletes each removed photo', async () => {
    await syncItemPhotos(7, ['/uploads/photos/a.jpg', '/uploads/photos/b.jpg'], []);

    expect(vi.mocked(api.delete)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.delete).mock.calls[0][0]).toBe('/items/7/photos');
  });

  it('sends every new file in a single request', async () => {
    const files = [new File(['x'], 'a.jpg'), new File(['y'], 'b.jpg')];

    await syncItemPhotos(7, [], files);

    expect(vi.mocked(api.post)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api.post).mock.calls[0][0]).toBe('/items/7/photos');
  });

  it('deletes before adding, so replacing a full gallery fits the budget', async () => {
    const order: string[] = [];
    vi.mocked(api.delete).mockImplementation((async () => { order.push('delete'); return { data: {} }; }) as never);
    vi.mocked(api.post).mockImplementation((async () => { order.push('post'); return { data: {} }; }) as never);

    await syncItemPhotos(7, ['/uploads/photos/a.jpg'], [new File(['x'], 'b.jpg')]);

    expect(order).toEqual(['delete', 'post']);
  });

  it('sends nothing when there is nothing to change', async () => {
    await syncItemPhotos(7, [], []);

    expect(vi.mocked(api.post)).not.toHaveBeenCalled();
    expect(vi.mocked(api.delete)).not.toHaveBeenCalled();
  });
});
```

Compléter les imports du fichier de test : `vi`, `beforeEach` depuis `vitest`, `syncItemPhotos` et `MAX_PHOTOS_PER_ITEM` depuis `./photo`, et `api` depuis `./api`.

- [ ] **Step 2: Lancer les tests et vérifier l'échec**

```bash
npm run test -w packages/web
```

Attendu : ÉCHEC sur `syncItemPhotos is not a function`.

- [ ] **Step 3: Écrire l'implémentation minimale**

Ajouter à la fin de `packages/web/src/lib/photo.ts` :

```ts
import { api } from './api';

/** Mirrors MAX_PHOTOS_PER_ITEM on the API; the server refuses beyond it anyway. */
export const MAX_PHOTOS_PER_ITEM = 6;

/**
 * Apply the gallery changes an admin made in the form.
 *
 * Deletions run before additions: swapping all six photos at once would
 * otherwise be refused by the server's budget check.
 */
export async function syncItemPhotos(
  itemId: number,
  removedUrls: string[],
  addedFiles: File[]
): Promise<void> {
  for (const url of removedUrls) {
    await api.delete(`/items/${itemId}/photos`, { data: { url } });
  }

  if (addedFiles.length === 0) return;

  const body = new FormData();
  for (const file of addedFiles) {
    body.append('photos', file);
  }
  await api.post(`/items/${itemId}/photos`, body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

```bash
npm run test -w packages/web
```

Attendu : tous verts.

- [ ] **Step 5: Écrire les tests qui échouent pour la galerie**

Ajouter à `packages/web/src/components/admin/ItemForm.test.tsx` :

```ts
describe('ItemForm photo gallery', () => {
  it('shows every existing photo of the item', () => {
    render(
      <ItemForm
        item={{ id: 1, nom: 'Sono', photoUrls: ['/uploads/photos/a.jpg', '/uploads/photos/b.jpg'] }}
        categories={categories}
        localisations={localisations}
        onSave={() => {}}
        isSaving={false}
        onCancel={() => {}}
      />
    );

    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('counts the photos against the limit', () => {
    render(
      <ItemForm
        item={{ id: 1, nom: 'Sono', photoUrls: ['/uploads/photos/a.jpg'] }}
        categories={categories}
        localisations={localisations}
        onSave={() => {}}
        isSaving={false}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('1/6')).toBeTruthy();
  });

  it('reports a removed photo without touching the server', async () => {
    const onSave = vi.fn();
    render(
      <ItemForm
        item={{ id: 1, nom: 'Sono', photoUrls: ['/uploads/photos/a.jpg'] }}
        categories={categories}
        localisations={localisations}
        onSave={onSave}
        isSaving={false}
        onCancel={() => {}}
      />
    );

    await userEvent.click(screen.getByLabelText('Retirer la photo 1'));
    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }));

    expect(onSave.mock.calls[0][0]._removedPhotoUrls).toEqual(['/uploads/photos/a.jpg']);
  });
});
```

Ajouter `vi` aux imports `vitest` du fichier.

- [ ] **Step 6: Lancer les tests et vérifier l'échec**

```bash
npm run test -w packages/web
```

Attendu : ÉCHEC — aucune image rendue, pas de compteur, pas de bouton de retrait.

- [ ] **Step 7: Remplacer l'état photo du formulaire**

Dans `packages/web/src/components/admin/ItemForm.tsx`, remplacer les états `photoPreview` et `photoFile` par :

```ts
  const [keptUrls, setKeptUrls] = useState<string[]>([]);
  const [removedUrls, setRemovedUrls] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
```

Dans le `useEffect` qui réagit à `item`, remplacer `setPhotoPreview(item.photoUrl || null); setPhotoFile(null);` par :

```ts
      setKeptUrls(item.photoUrls ?? []);
      setRemovedUrls([]);
      setPendingFiles([]);
```

- [ ] **Step 8: Remplacer les gestionnaires photo**

Remplacer `handlePhotoSelect`, `removePhoto` et `uploadPhoto` par :

```ts
  const totalPhotos = keptUrls.length + pendingFiles.length;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = '';
    if (chosen.length === 0) return;

    for (const file of chosen) {
      const check = validatePhotoFile(file);
      if (!check.ok) {
        alert(check.message);
        return;
      }
    }

    if (totalPhotos + chosen.length > MAX_PHOTOS_PER_ITEM) {
      alert(`Un item ne peut pas depasser ${MAX_PHOTOS_PER_ITEM} photos. Il reste ${MAX_PHOTOS_PER_ITEM - totalPhotos} place(s).`);
      return;
    }

    setPendingFiles((files) => [...files, ...chosen]);
  };

  const removeKept = (url: string) => {
    setKeptUrls((urls) => urls.filter((u) => u !== url));
    setRemovedUrls((urls) => [...urls, url]);
  };

  const removePending = (index: number) => {
    setPendingFiles((files) => files.filter((_, i) => i !== index));
  };
```

- [ ] **Step 9: Passer les changements à onSave**

Dans `handleSubmit`, remplacer le bloc qui commence par `// If editing and there's a new photo` et se termine par `data._pendingPhoto = photoFile;` par :

```ts
    data._pendingPhotos = pendingFiles;
    data._removedPhotoUrls = removedUrls;
```

Le formulaire n'appelle plus l'API lui-même ; `InventairePage` orchestre.

- [ ] **Step 10: Remplacer le rendu photo**

Remplacer tout le bloc `{/* Photo */}` par :

```tsx
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-sm">Photos <span className="text-muted-foreground">{totalPhotos}/{MAX_PHOTOS_PER_ITEM}</span></label>
          <div className="flex flex-wrap items-start gap-3">
            {keptUrls.map((url, i) => (
              <div key={url} className="relative">
                <img src={url} alt={`Photo ${i + 1}`} className="h-24 w-24 rounded-md border border-border object-contain" />
                <button type="button" onClick={() => removeKept(url)} aria-label={`Retirer la photo ${i + 1}`}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-white hover:bg-destructive/80">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {pendingFiles.map((file, i) => (
              <div key={`${file.name}-${i}`} className="relative">
                <img src={URL.createObjectURL(file)} alt={file.name} className="h-24 w-24 rounded-md border border-dashed border-primary object-contain" />
                <button type="button" onClick={() => removePending(i)} aria-label={`Retirer ${file.name}`}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-white hover:bg-destructive/80">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {totalPhotos === 0 && (
              <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed border-border bg-muted/50">
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={totalPhotos >= MAX_PHOTOS_PER_ITEM}
            className="mt-2 flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted disabled:opacity-50">
            <Upload className="h-4 w-4" /> Ajouter des photos
          </button>
          <p className="mt-1 text-xs text-muted-foreground">JPG, PNG ou WebP. 10 Mo max par photo.</p>
        </div>
```

Ajouter `MAX_PHOTOS_PER_ITEM` à l'import depuis `../../lib/photo`. Retirer l'état `photoUploading` et ses usages, y compris dans le bouton de soumission où `isSaving || photoUploading` devient `isSaving`.

- [ ] **Step 11: Orchestrer dans InventairePage**

Dans `packages/web/src/pages/admin/InventairePage.tsx`, remplacer `handleSave` par :

```tsx
  const handleSave = (formData: Record<string, any>) => {
    const { _pendingPhotos = [], _removedPhotoUrls = [], ...itemData } = formData;

    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, ...itemData }, {
        onSuccess: async () => {
          await syncItemPhotos(editingItem.id, _removedPhotoUrls, _pendingPhotos);
          qc.invalidateQueries({ queryKey: ['items'] });
          setEditingItem(null);
          setShowForm(false);
        },
      });
    } else {
      createItem.mutate(itemData, {
        onSuccess: async (newItem: any) => {
          if (newItem?.id) {
            await syncItemPhotos(newItem.id, [], _pendingPhotos);
            qc.invalidateQueries({ queryKey: ['items'] });
          }
          setShowForm(false);
          setDuplicateSource(null);
        },
      });
    }
  };
```

Ajouter en haut du composant `const qc = useQueryClient();`, et les imports `import { useQueryClient } from '@tanstack/react-query';` et `import { syncItemPhotos } from '../../lib/photo';`. Supprimer l'import désormais inutile de `api`.

- [ ] **Step 12: Lancer tous les tests et le build**

```bash
npm run test -w packages/web
npx tsc --noEmit -p packages/web/tsconfig.app.json
npm run build:web
```

Attendu : tous verts, build réussi. `URL.createObjectURL` n'existe pas dans jsdom : ajouter en tête de `ItemForm.test.tsx` :

```ts
beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:preview', writable: true });
});
```

- [ ] **Step 13: Commit**

```bash
git add packages/web/src
git commit -m "Turn the item photo field into a gallery

The form now holds kept URLs and pending files and sends neither until save,
so Cancel really cancels. Deletions are applied before additions, otherwise
replacing a full gallery would trip the server's budget check."
```

---

### Task 5: Galerie dans la vue détaillée

**Files:**
- Modify: `packages/web/src/components/materiel/ItemDetail.tsx:39-49`
- Test: `packages/web/src/components/materiel/ItemDetail.test.tsx` (à créer)

**Interfaces:**
- Consumes: `Item.photoUrls` (tâche 1).
- Produces: rien pour les tâches suivantes.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `packages/web/src/components/materiel/ItemDetail.test.tsx` :

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemDetail from './ItemDetail';

const ITEM = {
  id: 1,
  nom: 'Sono portable',
  photoUrls: ['/uploads/photos/a.jpg', '/uploads/photos/b.jpg', '/uploads/photos/c.jpg'],
  etat: 'bon',
  typeItem: 'equipement',
  quantiteStock: 1,
  perimetreUtilisation: 'libre',
};

afterEach(cleanup);

describe('ItemDetail photos', () => {
  it('shows the first photo as the main one', () => {
    render(<ItemDetail item={ITEM} />);

    expect(screen.getByAltText('Sono portable').getAttribute('src')).toBe('/uploads/photos/a.jpg');
  });

  it('offers the others as thumbnails', () => {
    render(<ItemDetail item={ITEM} />);

    expect(screen.getByLabelText('Voir la photo 2')).toBeTruthy();
    expect(screen.getByLabelText('Voir la photo 3')).toBeTruthy();
  });

  it('swaps the main photo when a thumbnail is clicked', async () => {
    render(<ItemDetail item={ITEM} />);

    await userEvent.click(screen.getByLabelText('Voir la photo 3'));

    expect(screen.getByAltText('Sono portable').getAttribute('src')).toBe('/uploads/photos/c.jpg');
  });

  it('shows no thumbnail strip for a single photo', () => {
    render(<ItemDetail item={{ ...ITEM, photoUrls: ['/uploads/photos/a.jpg'] }} />);

    expect(screen.queryByLabelText('Voir la photo 2')).toBeNull();
  });

  it('falls back to the placeholder when there is no photo', () => {
    render(<ItemDetail item={{ ...ITEM, photoUrls: [] }} />);

    expect(screen.queryByAltText('Sono portable')).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier l'échec**

```bash
npm run test -w packages/web
```

Attendu : ÉCHEC — `ItemDetail` lit encore `item.photoUrl`, aucune vignette n'existe.

- [ ] **Step 3: Écrire l'implémentation minimale**

Dans `packages/web/src/components/materiel/ItemDetail.tsx`, ajouter `useState` à l'import React, puis en tête du composant :

```tsx
  const photos: string[] = item.photoUrls ?? [];
  const [mainPhoto, setMainPhoto] = useState(0);
  const current = photos[mainPhoto] ?? photos[0];
```

Remplacer le bloc `{/* Photo */}` par :

```tsx
      <div className="flex flex-col items-center gap-2 sm:w-40">
        {current ? (
          <img src={current} alt={item.nom} className="max-h-40 rounded-md border border-border object-contain" />
        ) : (
          <div className="flex h-32 w-32 items-center justify-center rounded-md border border-dashed border-border bg-muted/50">
            <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}

        {photos.length > 1 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {photos.map((url, i) => (
              <button key={url} type="button" onClick={() => setMainPhoto(i)}
                aria-label={`Voir la photo ${i + 1}`}
                className={`h-10 w-10 overflow-hidden rounded border ${i === mainPhoto ? 'border-primary' : 'border-border'}`}>
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
```

Les vignettes portent `alt=""` : elles sont décoratives, leur bouton porte déjà le libellé accessible.

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

```bash
npm run test -w packages/web
```

Attendu : tous verts.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/materiel
git commit -m "Show the item photo gallery in the detail view"
```

---

### Task 6: La duplication n'emporte plus les photos

**Files:**
- Modify: `packages/web/src/pages/admin/InventairePage.tsx:59-66`
- Test: `packages/web/src/pages/admin/InventairePage.test.tsx`

**Interfaces:**
- Consumes: `Item.photoUrls` (tâche 1).
- Produces: rien.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à `packages/web/src/pages/admin/InventairePage.test.tsx`, et donner à la constante `ITEM` la valeur `photoUrls: ['/uploads/photos/a.jpg']` :

```ts
  it('starts the copy without photos, so no two items share a file', async () => {
    await renderPage();

    await userEvent.click(screen.getByLabelText('Dupliquer Cable HDMI 5m'));

    expect(screen.getByText('0/6')).toBeTruthy();
  });
```

- [ ] **Step 2: Lancer le test et vérifier l'échec**

```bash
npm run test -w packages/web
```

Attendu : ÉCHEC, le compteur affiche `1/6` — la copie a hérité de la photo.

- [ ] **Step 3: Écrire l'implémentation minimale**

Dans `handleDuplicate`, retirer `photoUrl` de la déstructuration et de l'objet construit, et écarter `photoUrls` :

```tsx
  const handleDuplicate = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    // photoUrls is deliberately dropped: sharing a file between two items would
    // make removing a photo from one break the other.
    const { id, categorie, sousCategorie, localisation, photoUrls, createdAt, updatedAt, ...copy } = item;
    setDuplicateSource({
      ...copy,
      photoUrls: [],
      nom: `${item.nom} (copie)`,
      // The marking identifies one physical unit; the copy is a different one.
      marquage: '',
    });
    setEditingItem(null);
    setShowForm(true);
    setExpandedId(null);
  };
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

```bash
npm run test -w packages/web
```

Attendu : tous verts.

- [ ] **Step 5: Vérification finale avant déploiement**

```bash
npm run test -w packages/api
npm run test -w packages/web
npx tsc --noEmit -p packages/api/tsconfig.json
npx tsc --noEmit -p packages/web/tsconfig.app.json
npm run build:web
```

Attendu : tout vert. Puis vérifier à la main sur l'application locale (`npm run dev:api` et `npm run dev:web`) : ajouter trois photos à un item, en retirer une, enregistrer, rouvrir l'item et confirmer que la galerie correspond.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/pages/admin
git commit -m "Stop copying photos when duplicating an item

Two items pointing at the same file would make removing a photo from one
delete it for the other, now that removal unlinks from disk."
```

---

## Notes de déploiement

Le push de ces commits déclenche `prisma migrate deploy` sur la production. La
migration de la tâche 1 est irréversible une fois `photo_url` supprimée. Elle
doit avoir été vérifiée localement selon les étapes 2 et 6 de la tâche 1 avant
tout push.
