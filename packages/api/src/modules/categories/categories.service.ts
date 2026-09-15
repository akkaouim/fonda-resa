import { countLabel } from '../../shared/counts.js';

/**
 * Decide whether a category may be deleted.
 *
 * A category can be held back by two different things: the items classified
 * under it, and its own sub-categories. When both apply the message names both,
 * so an admin who clears one is not turned away a second time by the other.
 */
export function checkCategorieDeletable(
  categorie: { nom: string },
  itemCount: number,
  sousCount: number
): { ok: boolean; message?: string } {
  if (itemCount === 0 && sousCount === 0) {
    return { ok: true };
  }

  const obstacles: string[] = [];
  if (sousCount > 0) obstacles.push(countLabel(sousCount, 'sous-categorie'));
  if (itemCount > 0) obstacles.push(countLabel(itemCount, 'materiel'));

  return {
    ok: false,
    message: `"${categorie.nom}" ne peut pas etre supprimee : elle contient encore ${obstacles.join(' et ')}. Videz-la avant de supprimer.`,
  };
}

/**
 * Decide whether a sub-category may be deleted. Only the items classified under
 * it can hold it back, since a sub-category has no children of its own.
 */
export function checkSousCategorieDeletable(
  sousCategorie: { nom: string },
  itemCount: number
): { ok: boolean; message?: string } {
  if (itemCount === 0) {
    return { ok: true };
  }

  return {
    ok: false,
    message: `"${sousCategorie.nom}" ne peut pas etre supprimee : ${countLabel(itemCount, 'materiel')} y ${itemCount > 1 ? 'sont' : 'est'} encore classe${itemCount > 1 ? 's' : ''}. Retirez-${itemCount > 1 ? 'les' : 'le'} avant de supprimer.`,
  };
}
