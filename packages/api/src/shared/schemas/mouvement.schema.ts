import { z } from 'zod';
import { Etat } from '../enums.js';

const ligneMouvementSchema = z.object({
  itemId: z.number().int().positive(),
  quantite: z.number().int().positive('La quantite doit etre au moins 1'),
  etatConstate: z.nativeEnum(Etat).optional(),
  commentaire: z.string().max(500).optional(),
});

const ligneRetourSchema = ligneMouvementSchema.extend({
  etatConstate: z.nativeEnum(Etat, { required_error: 'L\'etat est obligatoire pour chaque item' }),
  quantiteAReparer: z.number().int().min(0).default(0),
  quantiteHorsService: z.number().int().min(0).default(0),
});

export const createSortieSchema = z.object({
  reservationId: z.number().int().positive().optional(),
  lignes: z.array(ligneMouvementSchema).min(1, 'Au moins un item doit etre selectionne'),
});

export const createRetourSchema = z.object({
  reservationId: z.number().int().positive().optional(),
  lignes: z.array(ligneRetourSchema).min(1, 'Au moins un item doit etre selectionne'),
});

export const createConsommationSchema = z.object({
  itemId: z.number().int().positive(),
  quantite: z.number().int().positive('La quantite doit etre au moins 1'),
  commentaire: z.string().max(500).optional(),
});
