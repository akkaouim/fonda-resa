# Photos multiples par item — design

Statut : validé le 2026-09-15, en attente de plan d'implémentation.

## Contexte

`Item.photoUrl` est un champ unique : un item ne peut porter qu'une seule photo.
Le besoin exprimé est de montrer un même matériel sous plusieurs angles — la
boîte et son contenu, le produit monté et démonté.

Les photos servent uniquement à **montrer**. Elles ne portent ni légende, ni
date, ni rôle particulier.

## Décisions

| Question | Choix | Raison |
|---|---|---|
| Modèle de données | `photoUrls String[]` sur `Item` | Pas de métadonnées à stocker : une table dédiée coûterait des jointures et un champ d'ordre pour un besoin que le tableau couvre exactement |
| Ordre d'affichage | Ordre d'ajout, premier élément = image principale | Réordonnancement écarté explicitement |
| Nombre maximum | 6 par item | Couvre boîte, contenu, monté, démonté et deux détails ; plafonne un item à 60 Mo sur le volume du VPS |
| Duplication d'item | Ne recopie plus les photos | Évite que deux items partagent un fichier, ce qui rendrait toute suppression destructrice pour l'autre |
| Prise d'effet | À l'enregistrement du formulaire | « Annuler » doit annuler les photos comme le reste ; l'immédiateté rendrait ce bouton mensonger |

Contrepartie assumée du tableau : ajouter plus tard des légendes ou un
historique daté imposerait une vraie migration vers une table.

## Modèle de données

```prisma
model Item {
  // ...
  photoUrls String[] @map("photo_urls")
  // photoUrl String? — supprimé
}
```

### Migration — le point à risque

`prisma migrate dev` génèrerait un « drop column / add column » qui **effacerait
toutes les photos existantes**. La migration doit être écrite à la main, en
trois temps et dans cet ordre :

```sql
ALTER TABLE items ADD COLUMN photo_urls text[] NOT NULL DEFAULT '{}';

UPDATE items SET photo_urls = ARRAY[photo_url] WHERE photo_url IS NOT NULL;

ALTER TABLE items DROP COLUMN photo_url;
```

Le `UPDATE` ne filtre pas sur `actif` : un item soft-deleted puis restauré doit
retrouver sa photo.

Le workflow `deploy.yml` lance `prisma migrate deploy` à chaque push sur `main`.
Cette migration s'exécutera donc **en production sans validation manuelle**, et
doit être juste du premier coup. Elle sera vérifiée sur une base locale avant
d'être poussée.

## API

### Constantes et garde

Dans `packages/api/src/shared/uploads.ts`, à côté de `MAX_PHOTO_BYTES` :

```ts
export const MAX_PHOTOS_PER_ITEM = 6;

export function checkPhotoBudget(existantes: number, ajoutees: number):
  { ok: boolean; message?: string };
```

Fonction pure, donc testable sans base de données.

### Routes

- **`POST /items/:id/photos`** — `upload.array('photos', MAX_PHOTOS_PER_ITEM)`.
  Ajoute les fichiers à la fin de `photoUrls`. Refuse en 409 `PHOTO_BUDGET_EXCEEDED`
  si le total dépasserait 6. Renvoie l'item à jour.

  **Nettoyage obligatoire en cas de refus.** multer écrit les fichiers sur le
  disque pendant l'analyse de la requête, donc avant que le gestionnaire ne
  puisse évaluer le budget : `upload.array` ne borne que le nombre de fichiers
  d'une même requête, pas le total avec l'existant. Un refus doit donc effacer
  les fichiers que multer vient d'écrire avant de répondre, sinon la route
  fabrique précisément les orphelins qu'elle est censée éviter. La même règle
  vaut pour tout échec survenant après l'écriture.
- **`DELETE /items/:id/photos`** — corps `{ url }`. Retire l'URL du tableau et
  efface le fichier du disque.
- **`POST /items/:id/photo`** (singulier) — supprimée, plus aucun appelant.

### Sécurité de la suppression

L'URL vient du client. Avant tout effacement :

1. vérifier que l'URL figure dans `item.photoUrls` — sinon 404 ;
2. dériver le nom de fichier avec `path.basename`, jamais par concaténation,
   pour qu'un `../` ne puisse pas sortir de `uploads/photos/`.

Sans ces deux contrôles, la route permettrait d'effacer un fichier arbitraire
du serveur.

Comme la duplication ne partage plus de fichiers, aucun comptage de références
n'est nécessaire : l'item qui détient l'URL est le seul à la détenir.

## Interface

### `ItemForm`

Une bande de vignettes sous le libellé Photos : les photos actuelles avec une
croix de retrait, suivies d'un bouton d'ajout en sélection multiple
(`accept="image/*"`, `multiple`). Chaque fichier passe par `validatePhotoFile`
puis par le budget de 6. Le compteur « n/6 » est affiché.

L'état local du formulaire porte deux listes : les URLs conservées et les
fichiers en attente. Rien ne part au serveur avant l'enregistrement.

Orchestration à l'enregistrement :

1. création ou mise à jour de l'item ;
2. `DELETE` pour chaque URL retirée ;
3. `POST` unique pour les fichiers en attente.

L'ordre importe : la suppression précède l'ajout, pour qu'un remplacement
complet de six photos ne bute pas sur le budget.

### `ItemDetail`

La première photo en grand, les autres en vignettes dessous. Cliquer une
vignette la passe en grand. Aucune visionneuse plein écran.

### `InventairePage`

La duplication cesse de recopier `photoUrls` ; la copie démarre sans photo.

## Fichiers touchés

| Fichier | Nature |
|---|---|
| `packages/api/prisma/schema.prisma` | `photoUrls`, suppression de `photoUrl` |
| `packages/api/prisma/migrations/…` | migration écrite à la main |
| `packages/api/src/shared/uploads.ts` | `MAX_PHOTOS_PER_ITEM`, `checkPhotoBudget` |
| `packages/api/src/shared/types/item.ts` | `photoUrls: string[]` |
| `packages/api/src/modules/items/items.routes.ts` | routes photos |
| `packages/api/src/modules/items/items.service.ts` | `photoUrls` en création |
| `packages/web/src/shared/types/item.ts` | copie du type |
| `packages/web/src/components/admin/ItemForm.tsx` | galerie d'édition |
| `packages/web/src/components/materiel/ItemDetail.tsx` | galerie d'affichage |
| `packages/web/src/pages/admin/InventairePage.tsx` | duplication sans photos |
| `packages/api/prisma/seed-photos.ts`, `seed-photos-fix.ts`, `clean-photos.ts` | écriture en tableau |

Les trois scripts `prisma/` ne sont ni compilés ni testés (`include: ["src"]`),
mais planteraient à l'exécution s'ils n'étaient pas mis à jour.

## Tests

Côté API, en fonctions pures : `checkPhotoBudget` aux bornes (0+6 accepté,
5+2 refusé, message citant la limite), et la règle de validation d'URL avant
effacement. Le nettoyage des fichiers après un refus reçoit sa fonction
d'effacement en paramètre, ce qui permet de le vérifier sans disque ni serveur :
le projet n'a pas d'outillage de test d'intégration, et en ajouter un
dépasserait ce périmètre.

Côté web : l'ajout de plusieurs fichiers d'un coup, le retrait d'une vignette,
le refus au-delà de six, le fait que rien ne parte avant l'enregistrement, et
le changement de photo principale au clic dans `ItemDetail`. Le test de
duplication existant est mis à jour pour vérifier que la copie n'hérite
d'aucune photo.

## Hors périmètre

Légendes, historique daté de l'état, visionneuse plein écran, vignettes dans le
tableau d'inventaire, compression des images côté client, et reprise des
fichiers déjà orphelins sur le disque.
