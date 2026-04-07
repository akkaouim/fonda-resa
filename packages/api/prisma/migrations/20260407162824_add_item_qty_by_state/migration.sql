-- AlterTable
ALTER TABLE "items" ADD COLUMN     "quantite_a_reparer" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quantite_hors_service" INTEGER NOT NULL DEFAULT 0;
