import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
import { logAudit } from '../../services/audit.service.js';

const ITEM_INCLUDE = {
  categorie: true,
  sousCategorie: true,
  localisation: true,
};

interface ItemFilters {
  search?: string;
  categorieId?: number;
  sousCategorieId?: number;
  etat?: string;
  typeItem?: string;
  localisationId?: number;
  perimetreUtilisation?: string;
  actif?: boolean;
  page?: number;
  limit?: number;
}

export async function listItems(filters: ItemFilters) {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.ItemWhereInput = { actif: filters.actif ?? true };

  if (filters.search) {
    where.OR = [
      { nom: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { marquage: { contains: filters.search, mode: 'insensitive' } },
      { notes: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.categorieId) where.categorieId = filters.categorieId;
  if (filters.sousCategorieId) where.sousCategorieId = filters.sousCategorieId;
  if (filters.etat) where.etat = filters.etat as any;
  if (filters.typeItem) where.typeItem = filters.typeItem as any;
  if (filters.localisationId) where.localisationId = filters.localisationId;
  if (filters.perimetreUtilisation) where.perimetreUtilisation = filters.perimetreUtilisation as any;

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      include: ITEM_INCLUDE,
      orderBy: [{ categorie: { nom: 'asc' } }, { nom: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.item.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getItemById(id: number) {
  const item = await prisma.item.findUnique({
    where: { id },
    include: ITEM_INCLUDE,
  });
  if (!item) {
    throw new AppError(404, 'NOT_FOUND', 'Item introuvable');
  }
  return item;
}

export async function createItem(data: Prisma.ItemCreateInput & Record<string, any>, adminId: number) {
  const item = await prisma.item.create({
    data: {
      nom: data.nom,
      description: data.description,
      categorieId: data.categorieId,
      sousCategorieId: data.sousCategorieId,
      quantiteStock: data.quantiteStock ?? 1,
      etat: data.etat,
      commentaireEtat: data.commentaireEtat,
      localisationId: data.localisationId,
      perimetreUtilisation: data.perimetreUtilisation,
      marquage: data.marquage,
      typeItem: data.typeItem,
      photoUrl: data.photoUrl,
      dateAcquisition: data.dateAcquisition ? new Date(data.dateAcquisition) : undefined,
      valeurEstimee: data.valeurEstimee,
      notes: data.notes,
    },
    include: ITEM_INCLUDE,
  });

  await logAudit({
    utilisateurId: adminId,
    action: 'item.create',
    entiteType: 'Item',
    entiteId: item.id,
    details: { nom: item.nom },
  });

  return item;
}

export async function updateItem(id: number, data: Record<string, any>, adminId: number) {
  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Item introuvable');

  const updateData: any = { ...data };
  if (data.dateAcquisition) updateData.dateAcquisition = new Date(data.dateAcquisition);

  const item = await prisma.item.update({
    where: { id },
    data: updateData,
    include: ITEM_INCLUDE,
  });

  await logAudit({
    utilisateurId: adminId,
    action: 'item.update',
    entiteType: 'Item',
    entiteId: id,
    details: { nom: item.nom },
  });

  return item;
}

export async function deleteItem(id: number, adminId: number) {
  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Item introuvable');

  // Soft delete
  await prisma.item.update({ where: { id }, data: { actif: false } });

  await logAudit({
    utilisateurId: adminId,
    action: 'item.delete',
    entiteType: 'Item',
    entiteId: id,
    details: { nom: existing.nom },
  });
}

export async function importItems(rows: Record<string, any>[], adminId: number) {
  const results = { created: 0, errors: [] as { row: number; message: string }[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.nom) {
        results.errors.push({ row: i + 1, message: 'Nom requis' });
        continue;
      }

      // Resolve category by name if provided
      let categorieId: number | undefined;
      if (row.categorie) {
        const cat = await prisma.categorie.upsert({
          where: { nom: row.categorie },
          update: {},
          create: { nom: row.categorie },
        });
        categorieId = cat.id;
      }

      // Resolve location by name if provided
      let localisationId: number | undefined;
      if (row.localisation) {
        const loc = await prisma.localisation.upsert({
          where: { nom: row.localisation },
          update: {},
          create: { nom: row.localisation },
        });
        localisationId = loc.id;
      }

      await prisma.item.create({
        data: {
          nom: row.nom,
          description: row.description || undefined,
          categorieId,
          localisationId,
          quantiteStock: parseInt(row.quantiteStock || row.quantite || '1', 10) || 1,
          etat: row.etat || 'bon',
          commentaireEtat: row.commentaireEtat || undefined,
          marquage: row.marquage || undefined,
          typeItem: row.typeItem || 'equipement',
          perimetreUtilisation: row.perimetreUtilisation || 'libre',
          notes: row.notes || undefined,
        },
      });
      results.created++;
    } catch (error: any) {
      results.errors.push({ row: i + 1, message: error.message || 'Erreur inconnue' });
    }
  }

  await logAudit({
    utilisateurId: adminId,
    action: 'item.import',
    entiteType: 'Item',
    details: { created: results.created, errors: results.errors.length },
  });

  return results;
}
