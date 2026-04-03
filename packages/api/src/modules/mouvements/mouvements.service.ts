import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
import { logAudit } from '../../services/audit.service.js';

const MOUVEMENT_INCLUDE = {
  item: { include: { categorie: true, localisation: true } },
  utilisateur: { select: { id: true, nom: true, prenom: true, email: true } },
  reservation: { select: { id: true, motif: true, statut: true } },
};

// ─── Sortie ────────────────────────────────────────────
interface LigneMouvement {
  itemId: number;
  quantite: number;
  etatConstate?: string;
  commentaire?: string;
}

interface CreateSortieData {
  reservationId?: number;
  lignes: LigneMouvement[];
}

export async function createSortie(data: CreateSortieData, adminId: number) {
  // If linked to a reservation, check it is validee
  if (data.reservationId) {
    const reservation = await prisma.reservation.findUnique({ where: { id: data.reservationId } });
    if (!reservation) throw new AppError(404, 'NOT_FOUND', 'Reservation introuvable');
    if (reservation.statut !== 'validee') {
      throw new AppError(400, 'INVALID_STATUS', 'La reservation doit etre validee pour effectuer une sortie');
    }
  }

  const mouvements = [];
  for (const ligne of data.lignes) {
    const item = await prisma.item.findUnique({ where: { id: ligne.itemId } });
    if (!item || !item.actif) {
      throw new AppError(400, 'ITEM_NOT_FOUND', `Item #${ligne.itemId} introuvable`);
    }

    const mouvement = await prisma.mouvement.create({
      data: {
        itemId: ligne.itemId,
        utilisateurId: adminId,
        reservationId: data.reservationId || null,
        typeMouvement: 'sortie',
        quantite: ligne.quantite,
        etatConstate: (ligne.etatConstate as any) || null,
        commentaire: ligne.commentaire || null,
      },
      include: MOUVEMENT_INCLUDE,
    });
    mouvements.push(mouvement);
  }

  await logAudit({
    utilisateurId: adminId,
    action: 'mouvement.sortie',
    entiteType: 'Mouvement',
    details: {
      reservationId: data.reservationId,
      lignes: data.lignes.length,
      itemIds: data.lignes.map((l) => l.itemId),
    },
  });

  return mouvements;
}

// ─── Retour ────────────────────────────────────────────
interface CreateRetourData {
  reservationId?: number;
  lignes: LigneMouvement[];
}

export async function createRetour(data: CreateRetourData, adminId: number) {
  if (data.reservationId) {
    const reservation = await prisma.reservation.findUnique({ where: { id: data.reservationId } });
    if (!reservation) throw new AppError(404, 'NOT_FOUND', 'Reservation introuvable');
    if (reservation.statut !== 'validee') {
      throw new AppError(400, 'INVALID_STATUS', 'La reservation doit etre validee pour effectuer un retour');
    }
  }

  const mouvements = [];
  for (const ligne of data.lignes) {
    const item = await prisma.item.findUnique({ where: { id: ligne.itemId } });
    if (!item || !item.actif) {
      throw new AppError(400, 'ITEM_NOT_FOUND', `Item #${ligne.itemId} introuvable`);
    }

    const mouvement = await prisma.mouvement.create({
      data: {
        itemId: ligne.itemId,
        utilisateurId: adminId,
        reservationId: data.reservationId || null,
        typeMouvement: 'retour',
        quantite: ligne.quantite,
        etatConstate: (ligne.etatConstate as any) || null,
        commentaire: ligne.commentaire || null,
      },
      include: MOUVEMENT_INCLUDE,
    });
    mouvements.push(mouvement);
  }

  await logAudit({
    utilisateurId: adminId,
    action: 'mouvement.retour',
    entiteType: 'Mouvement',
    details: {
      reservationId: data.reservationId,
      lignes: data.lignes.length,
      itemIds: data.lignes.map((l) => l.itemId),
    },
  });

  return mouvements;
}

// ─── Consommation ──────────────────────────────────────
interface CreateConsommationData {
  itemId: number;
  quantite: number;
  commentaire?: string;
}

export async function createConsommation(data: CreateConsommationData, adminId: number) {
  const item = await prisma.item.findUnique({ where: { id: data.itemId } });
  if (!item || !item.actif) {
    throw new AppError(400, 'ITEM_NOT_FOUND', `Item #${data.itemId} introuvable`);
  }
  if (item.typeItem !== 'consommable') {
    throw new AppError(400, 'NOT_CONSOMMABLE', 'Cet item n\'est pas un consommable');
  }
  if (item.quantiteStock < data.quantite) {
    throw new AppError(400, 'INSUFFICIENT_STOCK', `Stock insuffisant (${item.quantiteStock} disponible(s))`);
  }

  const [mouvement] = await prisma.$transaction([
    prisma.mouvement.create({
      data: {
        itemId: data.itemId,
        utilisateurId: adminId,
        typeMouvement: 'consommation',
        quantite: data.quantite,
        commentaire: data.commentaire || null,
      },
      include: MOUVEMENT_INCLUDE,
    }),
    prisma.item.update({
      where: { id: data.itemId },
      data: { quantiteStock: { decrement: data.quantite } },
    }),
  ]);

  await logAudit({
    utilisateurId: adminId,
    action: 'mouvement.consommation',
    entiteType: 'Mouvement',
    entiteId: mouvement.id,
    details: {
      itemId: data.itemId,
      quantite: data.quantite,
      stockAvant: item.quantiteStock,
      stockApres: item.quantiteStock - data.quantite,
    },
  });

  return mouvement;
}

// ─── Listing ───────────────────────────────────────────
interface MouvementFilters {
  itemId?: number;
  utilisateurId?: number;
  typeMouvement?: string;
  reservationId?: number;
  page?: number;
  limit?: number;
}

export async function listMouvements(filters: MouvementFilters) {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 100);

  const where: any = {};
  if (filters.itemId) where.itemId = filters.itemId;
  if (filters.utilisateurId) where.utilisateurId = filters.utilisateurId;
  if (filters.typeMouvement) where.typeMouvement = filters.typeMouvement;
  if (filters.reservationId) where.reservationId = filters.reservationId;

  const [mouvements, total] = await Promise.all([
    prisma.mouvement.findMany({
      where,
      include: MOUVEMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.mouvement.count({ where }),
  ]);

  return { items: mouvements, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ─── Item history ──────────────────────────────────────
export async function getMouvementsByItem(itemId: number) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Item introuvable');

  const mouvements = await prisma.mouvement.findMany({
    where: { itemId },
    include: MOUVEMENT_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  return mouvements;
}
