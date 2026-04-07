import { Etat, PerimetreUtilisation, TypeItem, TypeRessource } from '../enums.js';

export interface Item {
  id: number;
  resourceType: TypeRessource;
  nom: string;
  description: string | null;
  categorieId: number | null;
  sousCategorieId: number | null;
  quantiteStock: number;
  quantiteDisponible?: number;
  etat: Etat;
  commentaireEtat: string | null;
  localisationId: number | null;
  perimetreUtilisation: PerimetreUtilisation;
  marquage: string | null;
  typeItem: TypeItem;
  photoUrl: string | null;
  dateAcquisition: Date | null;
  valeurEstimee: number | null;
  notes: string | null;
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Categorie {
  id: number;
  nom: string;
  sousCategories?: SousCategorie[];
}

export interface SousCategorie {
  id: number;
  nom: string;
  categorieId: number;
}

export interface Localisation {
  id: number;
  nom: string;
  estSurSite: boolean;
  description: string | null;
}

export interface CreateItemRequest {
  nom: string;
  description?: string;
  categorieId?: number;
  sousCategorieId?: number;
  quantiteStock: number;
  etat?: Etat;
  commentaireEtat?: string;
  localisationId?: number;
  perimetreUtilisation?: PerimetreUtilisation;
  marquage?: string;
  typeItem?: TypeItem;
  dateAcquisition?: string;
  valeurEstimee?: number;
  notes?: string;
}

export interface UpdateItemRequest extends Partial<CreateItemRequest> {}

export interface ItemFilters {
  search?: string;
  categorieId?: number;
  sousCategorieId?: number;
  etat?: Etat;
  typeItem?: TypeItem;
  localisationId?: number;
  perimetreUtilisation?: PerimetreUtilisation;
  disponible?: boolean;
  page?: number;
  limit?: number;
}
