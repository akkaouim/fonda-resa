import { z } from 'zod';
import { Etat } from '../enums.js';

const ligneMouvementSchema = z.object({
  itemId: z.number().int().positive(),
  quantite: z.number().int().positive('La quantite doit etre au moins 1'),
  etatConstate: z.nativeEnum(Etat).optional(),
  commentaire: z.string().max(500).optional(),
});

export const createSortieSchema = z.object({
  reservationId: z.number().int().positive().optional(),
  lignes: z.array(ligneMouvementSchema).min(1, 'Au moins un item doit etre selectionne'),
});

export const createRetourSchema = z.object({
  reservationId: z.number().int().positive().optional(),
  lignes: z.array(ligneMouvementSchema).min(1, 'Au moins un item doit etre selectionne'),
});

export const createConsommationSchema = z.object({
  itemId: z.number().int().positive(),
  quantite: z.number().int().positive('La quantite doit etre au moins 1'),
  commentaire: z.string().max(500).optional(),
});
