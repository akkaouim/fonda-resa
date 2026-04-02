// Enums
export {
  Role,
  Etat,
  PerimetreUtilisation,
  TypeItem,
  StatutReservation,
  TypeMouvement,
  TypeRessource,
} from './enums.js';

// Types
export type {
  Utilisateur,
  UtilisateurPublic,
  LoginRequest,
  LoginResponse,
  CreateUserRequest,
  UpdateUserRequest,
} from './types/user.js';

export type {
  Item,
  Categorie,
  SousCategorie,
  Localisation,
  CreateItemRequest,
  UpdateItemRequest,
  ItemFilters,
} from './types/item.js';

export type {
  Reservation,
  LigneReservation,
  CreateReservationRequest,
  UpdateReservationRequest,
} from './types/reservation.js';

export type {
  Mouvement,
  CreateSortieRequest,
  CreateRetourRequest,
  CreateConsommationRequest,
} from './types/mouvement.js';

export type { ApiResponse, PaginatedResponse } from './types/api.js';

// Schemas
export {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './schemas/user.schema.js';

export {
  createItemSchema,
  updateItemSchema,
  createCategorieSchema,
  createSousCategorieSchema,
  createLocalisationSchema,
} from './schemas/item.schema.js';

export {
  createReservationSchema,
  updateReservationSchema,
} from './schemas/reservation.schema.js';

export {
  createSortieSchema,
  createRetourSchema,
  createConsommationSchema,
} from './schemas/mouvement.schema.js';
