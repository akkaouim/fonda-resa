import { Router } from 'express';
import { Role, createCategorieSchema, createSousCategorieSchema } from '../../shared/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { AppError } from '../../middleware/error-handler.js';
import { prisma } from '../../config/database.js';
import { checkCategorieDeletable, checkSousCategorieDeletable } from './categories.service.js';

const router = Router();

/** Prisma surfaces constraint violations as a `code` on the thrown error. */
function prismaCode(err: unknown): string | undefined {
  return (err as { code?: string })?.code;
}

const notFound = (what: string) =>
  new AppError(404, 'CATEGORIE_NOT_FOUND', `${what} introuvable`);

// Public: list categories with their subcategories, each carrying the number of
// items filed under it so the admin UI can show counts and pre-empt a refused
// deletion.
router.get('/', authenticate, asyncHandler(async (_req, res) => {
  const categories = await prisma.categorie.findMany({
    include: {
      sousCategories: {
        orderBy: { nom: 'asc' },
        include: { _count: { select: { items: true } } },
      },
      _count: { select: { items: true } },
    },
    orderBy: { nom: 'asc' },
  });
  res.json({ success: true, data: categories });
}));

// Admin: create category
router.post('/', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const { nom } = createCategorieSchema.parse(req.body);
  try {
    const categorie = await prisma.categorie.create({ data: { nom } });
    res.status(201).json({ success: true, data: categorie });
  } catch (err) {
    // Categorie.nom is unique across the whole table.
    if (prismaCode(err) === 'P2002') {
      throw new AppError(409, 'CATEGORIE_DUPLICATE', `La categorie "${nom}" existe deja.`);
    }
    throw err;
  }
}));

// Admin: rename category
router.put('/:id', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const { nom } = createCategorieSchema.parse(req.body);
  try {
    const categorie = await prisma.categorie.update({
      where: { id: Number(req.params.id) },
      data: { nom },
    });
    res.json({ success: true, data: categorie });
  } catch (err) {
    if (prismaCode(err) === 'P2002') {
      throw new AppError(409, 'CATEGORIE_DUPLICATE', `La categorie "${nom}" existe deja.`);
    }
    if (prismaCode(err) === 'P2025') throw notFound('Categorie');
    throw err;
  }
}));

// Admin: delete category, refused while it holds items or sub-categories.
router.delete('/:id', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const categorie = await prisma.categorie.findUnique({
    where: { id },
    include: { _count: { select: { items: true, sousCategories: true } } },
  });
  if (!categorie) throw notFound('Categorie');

  const check = checkCategorieDeletable(
    categorie,
    categorie._count.items,
    categorie._count.sousCategories
  );
  if (!check.ok) throw new AppError(409, 'CATEGORIE_IN_USE', check.message!);

  await prisma.categorie.delete({ where: { id } });
  res.json({ success: true, data: { message: 'Categorie supprimee' } });
}));

// ─── Sub-categories ───────────────────────────────────────────────────────────

/**
 * A sub-category name is unique within its parent, not globally, so the
 * conflict message has to name the parent or it reads as a lie.
 */
async function duplicateSousCategorie(nom: string, categorieId: number): Promise<AppError> {
  const parent = await prisma.categorie.findUnique({ where: { id: categorieId } });
  return new AppError(
    409,
    'SOUS_CATEGORIE_DUPLICATE',
    `La sous-categorie "${nom}" existe deja dans "${parent?.nom ?? 'cette categorie'}".`
  );
}

// Admin: create subcategory
router.post('/sous-categories', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const data = createSousCategorieSchema.parse(req.body);
  try {
    const sous = await prisma.sousCategorie.create({ data });
    res.status(201).json({ success: true, data: sous });
  } catch (err) {
    if (prismaCode(err) === 'P2002') throw await duplicateSousCategorie(data.nom, data.categorieId);
    if (prismaCode(err) === 'P2003') throw notFound('Categorie parente');
    throw err;
  }
}));

// Admin: rename subcategory
router.put('/sous-categories/:id', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const data = createSousCategorieSchema.parse(req.body);
  try {
    const sous = await prisma.sousCategorie.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json({ success: true, data: sous });
  } catch (err) {
    if (prismaCode(err) === 'P2002') throw await duplicateSousCategorie(data.nom, data.categorieId);
    if (prismaCode(err) === 'P2025') throw notFound('Sous-categorie');
    throw err;
  }
}));

// Admin: delete subcategory, refused while it holds items.
router.delete('/sous-categories/:id', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const sous = await prisma.sousCategorie.findUnique({
    where: { id },
    include: { _count: { select: { items: true } } },
  });
  if (!sous) throw notFound('Sous-categorie');

  const check = checkSousCategorieDeletable(sous, sous._count.items);
  if (!check.ok) throw new AppError(409, 'SOUS_CATEGORIE_IN_USE', check.message!);

  await prisma.sousCategorie.delete({ where: { id } });
  res.json({ success: true, data: { message: 'Sous-categorie supprimee' } });
}));

export { router as categoriesRoutes };
