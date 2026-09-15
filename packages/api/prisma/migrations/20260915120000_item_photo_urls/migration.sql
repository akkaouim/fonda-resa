-- Add the array column first, backfill from the single column, and only then
-- drop it. Generating this migration automatically would drop and re-add,
-- losing every existing photo.
ALTER TABLE "items" ADD COLUMN "photo_urls" TEXT[] NOT NULL DEFAULT '{}';

-- No filter on `actif`: a soft-deleted item that is later restored must keep
-- its photo.
UPDATE "items" SET "photo_urls" = ARRAY["photo_url"] WHERE "photo_url" IS NOT NULL;

ALTER TABLE "items" DROP COLUMN "photo_url";
