import { z } from 'zod';

const ligneReservationSchema = z.object({
  itemId: z.number().int().positive(),
  quantiteDemandee: z.number().int().positive('La quantite doit etre au moins 1'),
});

export const createReservationSchema = z.object({
  dateDebut: z.string().datetime(),
  dateFin: z.string().datetime(),
  motif: z.string().min(1, 'Le motif est requis').max(500),
  lieuEvenement: z.string().min(1, 'Le lieu est requis').max(200),
  estHorsSite: z.boolean().default(false),
  lignes: z.array(ligneReservationSchema).min(1, 'Au moins un item doit etre selectionne'),
}).refine(
  (data) => new Date(data.dateFin) > new Date(data.dateDebut),
  { message: 'La date de fin doit etre apres la date de debut', path: ['dateFin'] }
);

export const updateReservationSchema = z.object({
  dateDebut: z.string().datetime().optional(),
  dateFin: z.string().datetime().optional(),
  motif: z.string().min(1).max(500).optional(),
  lieuEvenement: z.string().min(1).max(200).optional(),
  estHorsSite: z.boolean().optional(),
  lignes: z.array(ligneReservationSchema).min(1).optional(),
});
