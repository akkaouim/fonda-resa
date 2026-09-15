import { Router } from 'express';
import { Role, createItemSchema, updateItemSchema } from '../../shared/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { AppError } from '../../middleware/error-handler.js';
import { MAX_PHOTO_BYTES, MAX_PHOTOS_PER_ITEM, checkPhotoBudget, photoFilenameFromUrl, discardUploadedFiles, PHOTO_URL_PREFIX } from '../../shared/uploads.js';
import * as itemsService from './items.service.js';
import { prisma } from '../../config/database.js';
import multer from 'multer';
import path from 'path';
import { env } from '../../config/env.js';
import { PHOTOS_DIR } from '../../config/paths.js';
import fs from 'fs';

const router = Router();

// Photo upload config
const uploadDir = PHOTOS_DIR;
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
  limits: { fileSize: MAX_PHOTO_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);

    // Rejecting with `cb(null, false)` drops the file silently, and the route
    // then blames the user for sending nothing. Say what was actually wrong.
    const message = ['.heic', '.heif'].includes(ext)
      ? 'Format HEIC non pris en charge. Convertissez la photo en JPEG.'
      : 'Format non pris en charge. Utilisez un JPG, un PNG ou un WebP.';
    cb(new AppError(400, 'UNSUPPORTED_FORMAT', message));
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

// Add photos (admin). multer writes the files to disk while parsing, before
// this handler runs, so anything refused here must be unlinked by hand.
router.post('/:id/photos', authenticate, authorize(Role.ADMIN), upload.array('photos', MAX_PHOTOS_PER_ITEM), asyncHandler(async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    throw new AppError(400, 'NO_FILE', 'Aucun fichier envoye');
  }

  const discard = () => discardUploadedFiles(files, (p) => fs.promises.unlink(p));

  const id = Number(req.params.id);
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    await discard();
    throw new AppError(404, 'ITEM_NOT_FOUND', 'Item introuvable');
  }

  const budget = checkPhotoBudget(item.photoUrls.length, files.length);
  if (!budget.ok) {
    await discard();
    throw new AppError(409, 'PHOTO_BUDGET_EXCEEDED', budget.message!);
  }

  const added = files.map((file) => `${PHOTO_URL_PREFIX}${file.filename}`);
  const updated = await itemsService.updateItem(id, { photoUrls: [...item.photoUrls, ...added] }, req.user!.sub);
  res.json({ success: true, data: updated });
}));

// Remove one photo (admin), from the item and from disk.
router.delete('/:id/photos', authenticate, authorize(Role.ADMIN), asyncHandler(async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    throw new AppError(400, 'NO_URL', 'Aucune photo indiquee');
  }

  const id = Number(req.params.id);
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    throw new AppError(404, 'ITEM_NOT_FOUND', 'Item introuvable');
  }
  // Only a URL this item actually holds may be deleted.
  if (!item.photoUrls.includes(url)) {
    throw new AppError(404, 'PHOTO_NOT_FOUND', 'Photo introuvable sur cet item');
  }

  const filename = photoFilenameFromUrl(url);
  if (filename) {
    await fs.promises.unlink(path.join(PHOTOS_DIR, filename)).catch(() => { /* already gone */ });
  }

  const updated = await itemsService.updateItem(
    id,
    { photoUrls: item.photoUrls.filter((u) => u !== url) },
    req.user!.sub
  );
  res.json({ success: true, data: updated });
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
