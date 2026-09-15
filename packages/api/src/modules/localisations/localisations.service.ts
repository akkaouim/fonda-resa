import { countLabel } from '../../shared/counts.js';

/**
 * Decide whether a localisation may be deleted.
 *
 * A localisation is the physical place an item lives in, so deleting one that
 * still holds material would orphan those items. The deletion is refused
 * instead, and the caller reports it as a 409.
 */
export function checkLocalisationDeletable(
  localisation: { nom: string },
  itemCount: number
): { ok: boolean; message?: string } {
  if (itemCount === 0) {
    return { ok: true };
  }

  const plural = itemCount > 1;

  return {
    ok: false,
    message: `"${localisation.nom}" ne peut pas etre supprimee : ${countLabel(itemCount, 'materiel')} y ${plural ? 'sont' : 'est'} encore range${plural ? 's' : ''}. Deplacez-${plural ? 'les' : 'le'} avant de supprimer.`,
  };
}

/**
 * Normalise a description into the value to store.
 *
 * `createLocalisationSchema` makes the description optional, and Prisma skips
 * `undefined` fields on update — which would make an emptied description
 * impossible to clear. Collapsing blank input to an explicit null fixes that
 * and keeps a PUT a genuine full replacement.
 */
export function normaliseDescription(description?: string): string | null {
  return description?.trim() || null;
}
