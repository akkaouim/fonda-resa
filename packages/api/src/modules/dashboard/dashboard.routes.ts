import { Router } from 'express';
import { Role } from '../../shared/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { prisma } from '../../config/database.js';

const router = Router();

// GET /api/dashboard — admin only, aggregated stats
router.get('/', authenticate, authorize(Role.ADMIN), asyncHandler(async (_req, res) => {
  const [
    reservationsEnAttente,
    retoursEnRetard,
    itemsAReparer,
    consommablesBas,
    reservationsRecentes,
    mouvementsRecents,
  ] = await Promise.all([
    // Reservations pending approval
    prisma.reservation.count({
      where: { statut: 'en_attente' },
    }),

    // Overdue returns: validated reservations past their end date
    prisma.reservation.count({
      where: {
        statut: 'validee',
        dateFin: { lt: new Date() },
      },
    }),

    // Items needing repair or out of service
    prisma.item.count({
      where: {
        etat: { in: ['a_reparer', 'hors_service'] },
        actif: true,
      },
    }),

    // Consumables with low stock (threshold: 5)
    prisma.item.findMany({
      where: {
        typeItem: 'consommable',
        quantiteStock: { lte: 5 },
        actif: true,
      },
      select: {
        id: true,
        nom: true,
        quantiteStock: true,
      },
      orderBy: { quantiteStock: 'asc' },
    }),

    // Last 5 reservations
    prisma.reservation.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        utilisateur: {
          select: { id: true, nom: true, prenom: true, email: true },
        },
        lignes: {
          include: {
            item: {
              select: { id: true, nom: true, quantiteStock: true },
            },
          },
        },
      },
    }),

    // Last 5 mouvements
    prisma.mouvement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        item: {
          select: { id: true, nom: true },
        },
        utilisateur: {
          select: { id: true, nom: true, prenom: true },
        },
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      reservationsEnAttente,
      retoursEnRetard,
      itemsAReparer,
      consommablesBas,
      reservationsRecentes,
      mouvementsRecents,
    },
  });
}));

export { router as dashboardRoutes };
