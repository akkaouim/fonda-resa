// Enums
export {
  Role,
  Etat,
  PerimetreUtilisation,
  TypeItem,
  StatutReservation,
  TypeMouvement,
  TypeRessource,
} from './enums';

// Types
export type {
  Utilisateur,
  UtilisateurPublic,
  LoginRequest,
  LoginResponse,
  CreateUserRequest,
  UpdateUserRequest,
} from './types/user';

export type {
  Item,
  Categorie,
  SousCategorie,
  Localisation,
  CreateItemRequest,
  UpdateItemRequest,
  ItemFilters,
} from './types/item';

export type {
  Reservation,
  LigneReservation,
  CreateReservationRequest,
  UpdateReservationRequest,
} from './types/reservation';

export type {
  Mouvement,
  CreateSortieRequest,
  CreateRetourRequest,
  CreateConsommationRequest,
} from './types/mouvement';

export type { ApiResponse, PaginatedResponse } from './types/api';

// Schemas
export {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  resetUserPasswordSchema,
} from './schemas/user.schema';

export {
  createItemSchema,
  updateItemSchema,
  createCategorieSchema,
  createSousCategorieSchema,
  createLocalisationSchema,
} from './schemas/item.schema';

export {
  createReservationSchema,
  updateReservationSchema,
} from './schemas/reservation.schema';

export {
  createSortieSchema,
  createRetourSchema,
  createConsommationSchema,
} from './schemas/mouvement.schema';
