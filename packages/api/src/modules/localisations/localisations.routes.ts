import { Router } from 'express';
import { Role, createLocalisationSchema } from '../../shared/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { AppError } from '../../middleware/error-handler.js';
import { prisma } from '../../config/database.js';
import { checkLocalisationDeletable, normaliseDescription } from './localisations.service.js';

const router = Router();

/** Prisma surfaces constraint violations as a `code` on the thrown error. */
function prismaCode(err: unknown): string | undefined {
  return (err as { code?: string })?.code;
}

/** A localisation name collides with an existing one (unique constraint). */
function duplicateName(nom: string): AppError {
  return new AppError(409, 'LOCALISATION_DUPLICATE', `La localisation "${nom}" existe deja.`);
}

// Public: list locations, with the number of items stored in each so the admin
// UI can show the count and disable deletion before the user even clicks.
router.get('/', authenticate, asyncHandler(async (_req, res) => {
  const localisations = await prisma.localisation.findMany({
    orderBy: { nom: 'asc' },
    include: { _count: { select: { items: true } } },
  });
  res.json({ success: true, data: localisations });
}));

// Admin: create
router.post('/', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const data = createLocalisationSchema.parse(req.body);
  try {
    const loc = await prisma.localisation.create({
      data: { ...data, description: normaliseDescription(data.description) },
    });
    res.status(201).json({ success: true, data: loc });
  } catch (err) {
    if (prismaCode(err) === 'P2002') throw duplicateName(data.nom);
    throw err;
  }
}));

// Admin: update
router.put('/:id', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const data = createLocalisationSchema.parse(req.body);
  try {
    const loc = await prisma.localisation.update({
      where: { id: Number(req.params.id) },
      data: { ...data, description: normaliseDescription(data.description) },
    });
    res.json({ success: true, data: loc });
  } catch (err) {
    if (prismaCode(err) === 'P2002') throw duplicateName(data.nom);
    if (prismaCode(err) === 'P2025') {
      throw new AppError(404, 'LOCALISATION_NOT_FOUND', 'Localisation introuvable');
    }
    throw err;
  }
}));

// Admin: delete, refused while the localisation still holds material.
router.delete('/:id', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const localisation = await prisma.localisation.findUnique({
    where: { id },
    include: { _count: { select: { items: true } } },
  });
  if (!localisation) {
    throw new AppError(404, 'LOCALISATION_NOT_FOUND', 'Localisation introuvable');
  }

  const check = checkLocalisationDeletable(localisation, localisation._count.items);
  if (!check.ok) {
    throw new AppError(409, 'LOCALISATION_IN_USE', check.message!);
  }

  await prisma.localisation.delete({ where: { id } });
  res.json({ success: true, data: { message: 'Localisation supprimee' } });
}));

export { router as localisationsRoutes };
