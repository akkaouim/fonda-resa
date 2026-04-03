// --- Roles utilisateur ---
export enum Role {
  MEMBRE = 'membre',
  ADMIN = 'admin',
}

// --- Etat du materiel ---
export enum Etat {
  BON = 'bon',
  USAGE = 'usage',
  A_REPARER = 'a_reparer',
  HORS_SERVICE = 'hors_service',
}

// --- Perimetre d'utilisation ---
export enum PerimetreUtilisation {
  LIBRE = 'libre',
  SUR_LE_SITE = 'sur_le_site',
  SUR_PLACE = 'sur_place',
}

// --- Type d'item ---
export enum TypeItem {
  EQUIPEMENT = 'equipement',
  CONSOMMABLE = 'consommable',
}

// --- Statut de reservation ---
export enum StatutReservation {
  EN_ATTENTE = 'en_attente',
  VALIDEE = 'validee',
  SORTIE = 'sortie',
  RETOURNEE = 'retournee',
  REFUSEE = 'refusee',
  ANNULEE = 'annulee',
  TERMINEE = 'terminee',
}

// --- Type de mouvement ---
export enum TypeMouvement {
  SORTIE = 'sortie',
  RETOUR = 'retour',
  CONSOMMATION = 'consommation',
}

// --- Type de ressource (discriminateur V2) ---
export enum TypeRessource {
  MATERIEL = 'materiel',
  SALLE = 'salle',
  VEHICULE = 'vehicule',
}
