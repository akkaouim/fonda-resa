import { Router } from 'express';
import { Role, createItemSchema, updateItemSchema } from '@resa-esviere/shared';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import * as itemsService from './items.service.js';
import multer from 'multer';
import path from 'path';
import { env } from '../../config/env.js';
import fs from 'fs';

const router = Router();

// Photo upload config
const uploadDir = path.resolve(env.UPLOAD_DIR, 'photos');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// List items (all authenticated users)
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const filters = {
    search: req.query.search as string,
    categorieId: req.query.categorieId ? Number(req.query.categorieId) : undefined,
    sousCategorieId: req.query.sousCategorieId ? Number(req.query.sousCategorieId) : undefined,
    etat: req.query.etat as string,
    typeItem: req.query.typeItem as string,
    localisationId: req.query.localisationId ? Number(req.query.localisationId) : undefined,
    perimetreUtilisation: req.query.perimetreUtilisation as string,
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 20,
  };
  const result = await itemsService.listItems(filters);
  res.json({ success: true, data: result });
}));

// Get single item
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await itemsService.getItemById(Number(req.params.id));
  res.json({ success: true, data: item });
}));

// Create item (admin)
router.post('/', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const data = createItemSchema.parse(req.body);
  const item = await itemsService.createItem(data as any, req.user!.sub);
  res.status(201).json({ success: true, data: item });
}));

// Update item (admin)
router.put('/:id', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const data = updateItemSchema.parse(req.body);
  const item = await itemsService.updateItem(Number(req.params.id), data, req.user!.sub);
  res.json({ success: true, data: item });
}));

// Delete item (admin, soft delete)
router.delete('/:id', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  await itemsService.deleteItem(Number(req.params.id), req.user!.sub);
  res.json({ success: true, data: { message: 'Item supprime' } });
}));

// Upload photo (admin)
router.post('/:id/photo', authenticate, authorize(Role.ADMIN), upload.single('photo'), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'Aucun fichier envoye' } });
    return;
  }
  const photoUrl = `/uploads/photos/${req.file.filename}`;
  const item = await itemsService.updateItem(Number(req.params.id), { photoUrl }, req.user!.sub);
  res.json({ success: true, data: item });
}));

// Import CSV/Excel (admin)
router.post('/import', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_DATA', message: 'Aucune donnee a importer' },
    });
    return;
  }
  const result = await itemsService.importItems(rows, req.user!.sub);
  res.json({ success: true, data: result });
}));

export { router as itemsRoutes };
