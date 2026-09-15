/**
 * Render a count with its noun: "1 materiel", "7 materiels".
 *
 * French keeps the singular for zero and one, and the plural beyond — which is
 * why this is not a naive `count !== 1` check.
 */
export function countLabel(count: number, singular: string): string {
  return `${count} ${singular}${count > 1 ? 's' : ''}`;
}

/**
 * Relation-count filter restricting a `_count` to items that still exist for
 * the user.
 *
 * Deleting an item is a soft delete — `itemsService.deleteItem` only flips
 * `actif` to false, and every item listing filters on `actif: true`. A `_count`
 * that omits this filter therefore keeps counting material nobody can see,
 * which both reports a wrong number and makes the category or localisation
 * holding it impossible to delete: the guard insists on items the admin has no
 * way left to remove.
 *
 * Frozen because it is shared by every count site and handed straight to Prisma.
 */
export const ACTIVE_ITEMS_ONLY = Object.freeze({ where: Object.freeze({ actif: true }) });
