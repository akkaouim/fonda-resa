import { prisma } from '../../config/database.js';

/**
 * Calculate available quantity for an item over a date range.
 *
 * available = stock
 *   - reserved (validee or en_attente, overlapping dates)
 *   - checked out (sortie without matching retour)
 *
 * Optionally exclude a reservation (for updates).
 */
export async function getAvailableQuantity(
  itemId: number,
  dateDebut: Date,
  dateFin: Date,
  excludeReservationId?: number
): Promise<number> {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return 0;

  // Sum reserved quantities from active reservations that overlap the period
  const reservedResult = await prisma.ligneReservation.aggregate({
    _sum: { quantiteDemandee: true },
    where: {
      itemId,
      reservation: {
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
        statut: { in: ['validee', 'en_attente', 'sortie'] },
        dateDebut: { lt: dateFin },
        dateFin: { gt: dateDebut },
      },
    },
  });
  const reserved = reservedResult._sum.quantiteDemandee || 0;

  // Sum checked-out quantities not yet returned
  const checkedOutResult = await prisma.mouvement.aggregate({
    _sum: { quantite: true },
    where: {
      itemId,
      typeMouvement: 'sortie',
    },
  });
  const checkedOut = checkedOutResult._sum.quantite || 0;

  const returnedResult = await prisma.mouvement.aggregate({
    _sum: { quantite: true },
    where: {
      itemId,
      typeMouvement: 'retour',
    },
  });
  const returned = returnedResult._sum.quantite || 0;

  const netCheckedOut = Math.max(0, checkedOut - returned);

  return Math.max(0, item.quantiteStock - reserved - netCheckedOut);
}

/**
 * Validate perimeter compatibility between an item and a reservation location.
 */
export function validatePerimeter(
  item: { perimetreUtilisation: string; localisation?: { nom: string } | null },
  lieuEvenement: string,
  estHorsSite: boolean
): { ok: boolean; message?: string } {
  if (item.perimetreUtilisation === 'libre') {
    return { ok: true };
  }

  if (item.perimetreUtilisation === 'sur_le_site') {
    if (estHorsSite) {
      return {
        ok: false,
        message: `"${(item as any).nom}" ne peut pas quitter le site de l'Esviere`,
      };
    }
    return { ok: true };
  }

  if (item.perimetreUtilisation === 'sur_place') {
    const itemLocation = item.localisation?.nom || '';
    if (lieuEvenement !== itemLocation) {
      return {
        ok: false,
        message: `"${(item as any).nom}" ne peut pas quitter ${itemLocation}`,
      };
    }
    return { ok: true };
  }

  return { ok: true };
}
