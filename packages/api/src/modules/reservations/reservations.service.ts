import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
import { logAudit } from '../../services/audit.service.js';
import { getAvailableQuantity, validatePerimeter } from './availability.service.js';
import { sendReservationSubmitted, sendReservationApproved, sendReservationRefused } from '../../services/email.service.js';

const RESERVATION_INCLUDE = {
  utilisateur: { select: { id: true, nom: true, prenom: true, email: true } },
  lignes: {
    include: {
      item: {
        include: { categorie: true, sousCategorie: true, localisation: true },
      },
    },
  },
};

interface CreateReservationData {
  dateDebut: string;
  dateFin: string;
  motif: string;
  lieuEvenement: string;
  estHorsSite: boolean;
  lignes: { itemId: number; quantiteDemandee: number }[];
}

export async function createReservation(data: CreateReservationData, utilisateurId: number) {
  const dateDebut = new Date(data.dateDebut);
  const dateFin = new Date(data.dateFin);

  // Validate each line: availability + perimeter
  const warnings: string[] = [];
  for (const ligne of data.lignes) {
    const item = await prisma.item.findUnique({
      where: { id: ligne.itemId },
      include: { localisation: true },
    });
    if (!item || !item.actif) {
      throw new AppError(400, 'ITEM_NOT_FOUND', `Item #${ligne.itemId} introuvable`);
    }

    // Check availability
    const available = await getAvailableQuantity(item.id, dateDebut, dateFin);
    if (ligne.quantiteDemandee > available) {
      throw new AppError(400, 'INSUFFICIENT_QUANTITY', `Seulement ${available} unite(s) disponible(s) pour "${item.nom}" sur cette periode`, {
        itemId: item.id,
        available,
        requested: ligne.quantiteDemandee,
      });
    }

    // Check perimeter
    const perimCheck = validatePerimeter(item, data.lieuEvenement, data.estHorsSite);
    if (!perimCheck.ok) {
      warnings.push(perimCheck.message!);
    }
  }

  if (warnings.length > 0) {
    throw new AppError(400, 'PERIMETRE_VIOLATION', warnings.join('. '));
  }

  const reservation = await prisma.reservation.create({
    data: {
      utilisateurId,
      dateDebut,
      dateFin,
      motif: data.motif,
      lieuEvenement: data.lieuEvenement,
      estHorsSite: data.estHorsSite,
      lignes: {
        create: data.lignes.map((l) => ({
          itemId: l.itemId,
          quantiteDemandee: l.quantiteDemandee,
        })),
      },
    },
    include: RESERVATION_INCLUDE,
  });

  await logAudit({
    utilisateurId,
    action: 'reservation.create',
    entiteType: 'Reservation',
    entiteId: reservation.id,
    details: { motif: data.motif, lignes: data.lignes.length },
  });

  // Notify admins (best effort)
  const admins = await prisma.utilisateur.findMany({ where: { role: 'admin', actif: true } });
  const user = reservation.utilisateur;
  for (const admin of admins) {
    sendReservationSubmitted(admin.email, `${user.prenom} ${user.nom}`, data.motif).catch(() => {});
  }

  return reservation;
}

export async function listReservations(filters: {
  utilisateurId?: number;
  statut?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 100);

  const where: any = {};
  if (filters.utilisateurId) where.utilisateurId = filters.utilisateurId;
  if (filters.statut) where.statut = filters.statut;

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: RESERVATION_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.reservation.count({ where }),
  ]);

  return { items: reservations, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getReservationById(id: number) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: RESERVATION_INCLUDE,
  });
  if (!reservation) throw new AppError(404, 'NOT_FOUND', 'Reservation introuvable');
  return reservation;
}

export async function approveReservation(id: number, adminId: number, commentaire?: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { utilisateur: true },
  });
  if (!reservation) throw new AppError(404, 'NOT_FOUND', 'Reservation introuvable');
  if (reservation.statut !== 'en_attente') {
    throw new AppError(400, 'INVALID_STATUS', 'Seules les reservations en attente peuvent etre validees');
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { statut: 'validee', commentaireAdmin: commentaire },
    include: RESERVATION_INCLUDE,
  });

  await logAudit({
    utilisateurId: adminId,
    action: 'reservation.approve',
    entiteType: 'Reservation',
    entiteId: id,
  });

  sendReservationApproved(reservation.utilisateur.email, reservation.motif).catch(() => {});
  return updated;
}

export async function rejectReservation(id: number, adminId: number, commentaire?: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { utilisateur: true },
  });
  if (!reservation) throw new AppError(404, 'NOT_FOUND', 'Reservation introuvable');
  if (reservation.statut !== 'en_attente') {
    throw new AppError(400, 'INVALID_STATUS', 'Seules les reservations en attente peuvent etre refusees');
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { statut: 'refusee', commentaireAdmin: commentaire },
    include: RESERVATION_INCLUDE,
  });

  await logAudit({
    utilisateurId: adminId,
    action: 'reservation.reject',
    entiteType: 'Reservation',
    entiteId: id,
  });

  sendReservationRefused(reservation.utilisateur.email, reservation.motif, commentaire).catch(() => {});
  return updated;
}

export async function cancelReservation(id: number, userId: number) {
  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) throw new AppError(404, 'NOT_FOUND', 'Reservation introuvable');
  if (reservation.utilisateurId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'Vous ne pouvez annuler que vos propres reservations');
  }
  if (!['en_attente', 'validee'].includes(reservation.statut)) {
    throw new AppError(400, 'INVALID_STATUS', 'Cette reservation ne peut plus etre annulee');
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { statut: 'annulee' },
    include: RESERVATION_INCLUDE,
  });

  await logAudit({ utilisateurId: userId, action: 'reservation.cancel', entiteType: 'Reservation', entiteId: id });
  return updated;
}

export async function duplicateReservation(id: number, utilisateurId: number) {
  const original = await prisma.reservation.findUnique({
    where: { id },
    include: { lignes: { include: { item: true } } },
  });
  if (!original) throw new AppError(404, 'NOT_FOUND', 'Reservation introuvable');

  // Filter out deleted items
  const validLines = original.lignes.filter((l) => l.item.actif);
  const removedItems = original.lignes.filter((l) => !l.item.actif).map((l) => l.item.nom);

  return {
    motif: original.motif,
    lieuEvenement: original.lieuEvenement,
    estHorsSite: original.estHorsSite,
    lignes: validLines.map((l) => ({ itemId: l.itemId, quantiteDemandee: l.quantiteDemandee })),
    removedItems,
  };
}

export async function getItemAvailability(itemId: number, dateDebut: string, dateFin: string) {
  const available = await getAvailableQuantity(
    itemId,
    new Date(dateDebut),
    new Date(dateFin)
  );
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  return { itemId, quantiteStock: item?.quantiteStock || 0, quantiteDisponible: available };
}
