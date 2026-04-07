import { StatutReservation } from '../enums';

export interface Reservation {
  id: number;
  utilisateurId: number;
  dateDebut: Date;
  dateFin: Date;
  motif: string;
  lieuEvenement: string;
  estHorsSite: boolean;
  statut: StatutReservation;
  commentaireAdmin: string | null;
  createdAt: Date;
  updatedAt: Date;
  lignes?: LigneReservation[];
}

export interface LigneReservation {
  id: number;
  reservationId: number;
  itemId: number;
  quantiteDemandee: number;
}

export interface CreateReservationRequest {
  dateDebut: string;
  dateFin: string;
  motif: string;
  lieuEvenement: string;
  estHorsSite: boolean;
  lignes: { itemId: number; quantiteDemandee: number }[];
}

export interface UpdateReservationRequest {
  dateDebut?: string;
  dateFin?: string;
  motif?: string;
  lieuEvenement?: string;
  estHorsSite?: boolean;
  lignes?: { itemId: number; quantiteDemandee: number }[];
}
