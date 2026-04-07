import { Etat, TypeMouvement } from '../enums.js';

export interface Mouvement {
  id: number;
  itemId: number;
  utilisateurId: number;
  reservationId: number | null;
  typeMouvement: TypeMouvement;
  quantite: number;
  dateEffective: Date;
  etatConstate: Etat | null;
  commentaire: string | null;
  createdAt: Date;
}

export interface CreateSortieRequest {
  reservationId?: number;
  lignes: {
    itemId: number;
    quantite: number;
    etatConstate?: Etat;
    commentaire?: string;
  }[];
}

export interface CreateRetourRequest {
  reservationId?: number;
  lignes: {
    itemId: number;
    quantite: number;
    etatConstate?: Etat;
    commentaire?: string;
  }[];
}

export interface CreateConsommationRequest {
  itemId: number;
  quantite: number;
  commentaire?: string;
}
