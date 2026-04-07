import { Router } from 'express';
import { Role, createSortieSchema, createRetourSchema, createConsommationSchema } from '../../shared/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import * as mouvementsService from './mouvements.service.js';

const router = Router();

// All routes require admin
router.use(authenticate, authorize(Role.ADMIN));

// Record check-out (sortie)
router.post('/sortie', asyncHandler(async (req, res) => {
  const data = createSortieSchema.parse(req.body);
  const mouvements = await mouvementsService.createSortie(data, req.user!.sub);
  res.status(201).json({ success: true, data: mouvements });
}));

// Record return (retour)
router.post('/retour', asyncHandler(async (req, res) => {
  const data = createRetourSchema.parse(req.body);
  const mouvements = await mouvementsService.createRetour(data, req.user!.sub);
  res.status(201).json({ success: true, data: mouvements });
}));

// Decrement consumable stock
router.post('/consommation', asyncHandler(async (req, res) => {
  const data = createConsommationSchema.parse(req.body);
  const mouvement = await mouvementsService.createConsommation(data, req.user!.sub);
  res.status(201).json({ success: true, data: mouvement });
}));

// List all mouvements (with filters)
router.get('/', asyncHandler(async (req, res) => {
  const filters = {
    itemId: req.query.itemId ? Number(req.query.itemId) : undefined,
    utilisateurId: req.query.utilisateurId ? Number(req.query.utilisateurId) : undefined,
    typeMouvement: req.query.typeMouvement as string | undefined,
    reservationId: req.query.reservationId ? Number(req.query.reservationId) : undefined,
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 20,
  };
  const result = await mouvementsService.listMouvements(filters);
  res.json({ success: true, data: result });
}));

// Item movement history
router.get('/item/:id', asyncHandler(async (req, res) => {
  const mouvements = await mouvementsService.getMouvementsByItem(Number(req.params.id));
  res.json({ success: true, data: mouvements });
}));

export { router as mouvementsRoutes };
