// --- Roles utilisateur ---
export const Role = {
  MEMBRE: 'membre',
  ADMIN: 'admin',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

// --- Etat du materiel ---
export const Etat = {
  BON: 'bon',
  USAGE: 'usage',
  A_REPARER: 'a_reparer',
  HORS_SERVICE: 'hors_service',
} as const;
export type Etat = (typeof Etat)[keyof typeof Etat];

// --- Perimetre d'utilisation ---
export const PerimetreUtilisation = {
  LIBRE: 'libre',
  SUR_LE_SITE: 'sur_le_site',
  SUR_PLACE: 'sur_place',
} as const;
export type PerimetreUtilisation = (typeof PerimetreUtilisation)[keyof typeof PerimetreUtilisation];

// --- Type d'item ---
export const TypeItem = {
  EQUIPEMENT: 'equipement',
  CONSOMMABLE: 'consommable',
} as const;
export type TypeItem = (typeof TypeItem)[keyof typeof TypeItem];

// --- Statut de reservation ---
export const StatutReservation = {
  EN_ATTENTE: 'en_attente',
  VALIDEE: 'validee',
  SORTIE: 'sortie',
  RETOURNEE: 'retournee',
  REFUSEE: 'refusee',
  ANNULEE: 'annulee',
  TERMINEE: 'terminee',
} as const;
export type StatutReservation = (typeof StatutReservation)[keyof typeof StatutReservation];

// --- Type de mouvement ---
export const TypeMouvement = {
  SORTIE: 'sortie',
  RETOUR: 'retour',
  CONSOMMATION: 'consommation',
} as const;
export type TypeMouvement = (typeof TypeMouvement)[keyof typeof TypeMouvement];

// --- Type de ressource (discriminateur V2) ---
export const TypeRessource = {
  MATERIEL: 'materiel',
  SALLE: 'salle',
  VEHICULE: 'vehicule',
} as const;
export type TypeRessource = (typeof TypeRessource)[keyof typeof TypeRessource];
