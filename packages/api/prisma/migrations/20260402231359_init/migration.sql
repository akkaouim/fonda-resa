-- CreateEnum
CREATE TYPE "Role" AS ENUM ('membre', 'admin');

-- CreateEnum
CREATE TYPE "Etat" AS ENUM ('bon', 'usage', 'a_reparer', 'hors_service');

-- CreateEnum
CREATE TYPE "PerimetreUtilisation" AS ENUM ('libre', 'sur_le_site', 'sur_place');

-- CreateEnum
CREATE TYPE "TypeItem" AS ENUM ('equipement', 'consommable');

-- CreateEnum
CREATE TYPE "StatutReservation" AS ENUM ('en_attente', 'validee', 'refusee', 'annulee', 'terminee');

-- CreateEnum
CREATE TYPE "TypeMouvement" AS ENUM ('sortie', 'retour', 'consommation');

-- CreateEnum
CREATE TYPE "TypeRessource" AS ENUM ('materiel', 'salle', 'vehicule');

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "mot_de_passe" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'membre',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "reset_token" TEXT,
    "reset_token_expiry" TIMESTAMP(3),

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(100) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sous_categories" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "categorie_id" INTEGER NOT NULL,

    CONSTRAINT "sous_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "localisations" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(200) NOT NULL,
    "est_sur_site" BOOLEAN NOT NULL DEFAULT true,
    "description" VARCHAR(500),

    CONSTRAINT "localisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" SERIAL NOT NULL,
    "resource_type" "TypeRessource" NOT NULL DEFAULT 'materiel',
    "nom" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "categorie_id" INTEGER,
    "sous_categorie_id" INTEGER,
    "quantite_stock" INTEGER NOT NULL DEFAULT 1,
    "etat" "Etat" NOT NULL DEFAULT 'bon',
    "commentaire_etat" VARCHAR(500),
    "localisation_id" INTEGER,
    "perimetre_utilisation" "PerimetreUtilisation" NOT NULL DEFAULT 'libre',
    "marquage" VARCHAR(200),
    "type_item" "TypeItem" NOT NULL DEFAULT 'equipement',
    "photo_url" TEXT,
    "date_acquisition" TIMESTAMP(3),
    "valeur_estimee" DECIMAL(10,2),
    "notes" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" SERIAL NOT NULL,
    "utilisateur_id" INTEGER NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "motif" VARCHAR(500) NOT NULL,
    "lieu_evenement" VARCHAR(200) NOT NULL,
    "est_hors_site" BOOLEAN NOT NULL DEFAULT false,
    "statut" "StatutReservation" NOT NULL DEFAULT 'en_attente',
    "commentaire_admin" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_reservation" (
    "id" SERIAL NOT NULL,
    "reservation_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "quantite_demandee" INTEGER NOT NULL,

    CONSTRAINT "lignes_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvements" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "utilisateur_id" INTEGER NOT NULL,
    "reservation_id" INTEGER,
    "type_mouvement" "TypeMouvement" NOT NULL,
    "quantite" INTEGER NOT NULL,
    "date_effective" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etat_constate" "Etat",
    "commentaire" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mouvements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "utilisateur_id" INTEGER NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entite_type" VARCHAR(50) NOT NULL,
    "entite_id" INTEGER,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_reset_token_key" ON "utilisateurs"("reset_token");

-- CreateIndex
CREATE UNIQUE INDEX "categories_nom_key" ON "categories"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "sous_categories_categorie_id_nom_key" ON "sous_categories"("categorie_id", "nom");

-- CreateIndex
CREATE UNIQUE INDEX "localisations_nom_key" ON "localisations"("nom");

-- CreateIndex
CREATE INDEX "items_categorie_id_idx" ON "items"("categorie_id");

-- CreateIndex
CREATE INDEX "items_type_item_idx" ON "items"("type_item");

-- CreateIndex
CREATE INDEX "items_perimetre_utilisation_idx" ON "items"("perimetre_utilisation");

-- CreateIndex
CREATE INDEX "reservations_utilisateur_id_idx" ON "reservations"("utilisateur_id");

-- CreateIndex
CREATE INDEX "reservations_statut_idx" ON "reservations"("statut");

-- CreateIndex
CREATE INDEX "reservations_date_debut_date_fin_idx" ON "reservations"("date_debut", "date_fin");

-- CreateIndex
CREATE INDEX "lignes_reservation_item_id_idx" ON "lignes_reservation"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "lignes_reservation_reservation_id_item_id_key" ON "lignes_reservation"("reservation_id", "item_id");

-- CreateIndex
CREATE INDEX "mouvements_item_id_idx" ON "mouvements"("item_id");

-- CreateIndex
CREATE INDEX "mouvements_reservation_id_idx" ON "mouvements"("reservation_id");

-- CreateIndex
CREATE INDEX "mouvements_type_mouvement_idx" ON "mouvements"("type_mouvement");

-- CreateIndex
CREATE INDEX "audit_logs_entite_type_entite_id_idx" ON "audit_logs"("entite_type", "entite_id");

-- CreateIndex
CREATE INDEX "audit_logs_utilisateur_id_idx" ON "audit_logs"("utilisateur_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "sous_categories" ADD CONSTRAINT "sous_categories_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_sous_categorie_id_fkey" FOREIGN KEY ("sous_categorie_id") REFERENCES "sous_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_localisation_id_fkey" FOREIGN KEY ("localisation_id") REFERENCES "localisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_reservation" ADD CONSTRAINT "lignes_reservation_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_reservation" ADD CONSTRAINT "lignes_reservation_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements" ADD CONSTRAINT "mouvements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements" ADD CONSTRAINT "mouvements_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements" ADD CONSTRAINT "mouvements_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
