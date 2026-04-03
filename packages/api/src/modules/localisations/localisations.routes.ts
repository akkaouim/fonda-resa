import { Router } from 'express';
import { Role } from '@resa-esviere/shared';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { prisma } from '../../config/database.js';
import { createLocalisationSchema } from '@resa-esviere/shared';

const router = Router();

// Public: list locations
router.get('/', authenticate, asyncHandler(async (_req, res) => {
  const localisations = await prisma.localisation.findMany({ orderBy: { nom: 'asc' } });
  res.json({ success: true, data: localisations });
}));

// Admin: create
router.post('/', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const data = createLocalisationSchema.parse(req.body);
  const loc = await prisma.localisation.create({ data });
  res.status(201).json({ success: true, data: loc });
}));

// Admin: update
router.put('/:id', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const data = createLocalisationSchema.parse(req.body);
  const loc = await prisma.localisation.update({
    where: { id: Number(req.params.id) },
    data,
  });
  res.json({ success: true, data: loc });
}));

// Admin: delete
router.delete('/:id', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  await prisma.localisation.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true, data: { message: 'Localisation supprimee' } });
}));

export { router as localisationsRoutes };
