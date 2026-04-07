import { z } from 'zod';
import { Etat, PerimetreUtilisation, TypeItem } from '../enums.js';

export const createItemSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis').max(200),
  description: z.string().max(1000).optional(),
  categorieId: z.number().int().positive().optional(),
  sousCategorieId: z.number().int().positive().optional(),
  quantiteStock: z.number().int().min(0, 'La quantite doit etre positive ou nulle'),
  etat: z.nativeEnum(Etat).default(Etat.BON),
  commentaireEtat: z.string().max(500).optional(),
  localisationId: z.number().int().positive().optional(),
  perimetreUtilisation: z.nativeEnum(PerimetreUtilisation).default(PerimetreUtilisation.LIBRE),
  marquage: z.string().max(200).optional(),
  typeItem: z.nativeEnum(TypeItem).default(TypeItem.EQUIPEMENT),
  dateAcquisition: z.string().datetime().optional(),
  valeurEstimee: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateItemSchema = createItemSchema.partial();

export const createCategorieSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis').max(100),
});

export const createSousCategorieSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis').max(100),
  categorieId: z.number().int().positive(),
});

export const createLocalisationSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis').max(200),
  estSurSite: z.boolean().default(true),
  description: z.string().max(500).optional(),
});
