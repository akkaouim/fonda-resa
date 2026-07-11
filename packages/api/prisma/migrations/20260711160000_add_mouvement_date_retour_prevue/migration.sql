-- Add optional expected-return date to movements (used for check-outs without a reservation)
ALTER TABLE "mouvements" ADD COLUMN "date_retour_prevue" TIMESTAMP(3);
