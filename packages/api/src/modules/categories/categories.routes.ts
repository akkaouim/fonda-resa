import { Router } from 'express';
import { Role, createCategorieSchema, createSousCategorieSchema } from '../../shared/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { prisma } from '../../config/database.js';

const router = Router();

// Public: list categories with subcategories
router.get('/', authenticate, asyncHandler(async (_req, res) => {
  const categories = await prisma.categorie.findMany({
    include: { sousCategories: { orderBy: { nom: 'asc' } } },
    orderBy: { nom: 'asc' },
  });
  res.json({ success: true, data: categories });
}));

// Admin: create category
router.post('/', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const { nom } = createCategorieSchema.parse(req.body);
  const categorie = await prisma.categorie.create({ data: { nom } });
  res.status(201).json({ success: true, data: categorie });
}));

// Admin: update category
router.put('/:id', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const { nom } = createCategorieSchema.parse(req.body);
  const categorie = await prisma.categorie.update({
    where: { id: Number(req.params.id) },
    data: { nom },
  });
  res.json({ success: true, data: categorie });
}));

// Admin: delete category
router.delete('/:id', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  await prisma.categorie.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true, data: { message: 'Categorie supprimee' } });
}));

// Admin: create subcategory
router.post('/sous-categories', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const data = createSousCategorieSchema.parse(req.body);
  const sous = await prisma.sousCategorie.create({ data });
  res.status(201).json({ success: true, data: sous });
}));

// Admin: delete subcategory
router.delete('/sous-categories/:id', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  await prisma.sousCategorie.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true, data: { message: 'Sous-categorie supprimee' } });
}));

export { router as categoriesRoutes };
