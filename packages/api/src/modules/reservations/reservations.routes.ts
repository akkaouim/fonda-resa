import { Router } from 'express';
import { Role, createReservationSchema } from '@resa-esviere/shared';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import * as reservationsService from './reservations.service.js';

const router = Router();

// List reservations (member sees own, admin sees all)
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const filters: any = {
    statut: req.query.statut as string,
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 20,
  };
  // Members only see their own reservations
  if (req.user!.role !== 'admin') {
    filters.utilisateurId = req.user!.sub;
  } else if (req.query.utilisateurId) {
    filters.utilisateurId = Number(req.query.utilisateurId);
  }
  const result = await reservationsService.listReservations(filters);
  res.json({ success: true, data: result });
}));

// Get single reservation
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const reservation = await reservationsService.getReservationById(Number(req.params.id));
  // Members can only see their own
  if (req.user!.role !== 'admin' && reservation.utilisateurId !== req.user!.sub) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Acces refuse' } });
    return;
  }
  res.json({ success: true, data: reservation });
}));

// Create reservation
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const data = createReservationSchema.parse(req.body);
  const reservation = await reservationsService.createReservation(data, req.user!.sub);
  res.status(201).json({ success: true, data: reservation });
}));

// Cancel reservation (own)
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const reservation = await reservationsService.cancelReservation(Number(req.params.id), req.user!.sub);
  res.json({ success: true, data: reservation });
}));

// Admin: approve
router.post('/:id/approve', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const reservation = await reservationsService.approveReservation(
    Number(req.params.id), req.user!.sub, req.body.commentaire
  );
  res.json({ success: true, data: reservation });
}));

// Admin: reject
router.post('/:id/reject', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const reservation = await reservationsService.rejectReservation(
    Number(req.params.id), req.user!.sub, req.body.commentaire
  );
  res.json({ success: true, data: reservation });
}));

// Duplicate reservation (pre-fill)
router.post('/:id/duplicate', authenticate, asyncHandler(async (req, res) => {
  const data = await reservationsService.duplicateReservation(Number(req.params.id), req.user!.sub);
  res.json({ success: true, data });
}));

// Check availability for an item on a date range
router.get('/availability/:itemId', authenticate, asyncHandler(async (req, res) => {
  const { dateDebut, dateFin } = req.query;
  if (!dateDebut || !dateFin) {
    res.status(400).json({ success: false, error: { code: 'MISSING_DATES', message: 'dateDebut et dateFin requis' } });
    return;
  }
  const data = await reservationsService.getItemAvailability(
    Number(req.params.itemId), dateDebut as string, dateFin as string
  );
  res.json({ success: true, data });
}));

export { router as reservationsRoutes };
