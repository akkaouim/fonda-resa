/**
 * Render a count with its noun: "1 materiel", "7 materiels".
 *
 * French keeps the singular for zero and one, and the plural beyond — which is
 * why this is not a naive `count !== 1` check.
 */
export function countLabel(count: number, singular: string): string {
  return `${count} ${singular}${count > 1 ? 's' : ''}`;
}
