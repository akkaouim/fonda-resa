/** Upload ceiling for item photos. Phone cameras routinely produce 5-8 Mo. */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/**
 * Turn a multer failure code into something the user can act on.
 *
 * Multer throws outside the route handler, so without this mapping every
 * oversized upload surfaced as a generic 500 that named no cause.
 */
export function multerErrorMessage(code: string): string {
  if (code === 'LIMIT_FILE_SIZE') {
    return `La photo ne doit pas depasser ${MAX_PHOTO_BYTES / (1024 * 1024)} Mo.`;
  }
  return "Le fichier n'a pas pu etre envoye.";
}

/** A handful of angles is what the gallery is for; storage is a VPS volume. */
export const MAX_PHOTOS_PER_ITEM = 6;

/**
 * Decide whether an upload fits in what the item has left.
 *
 * Reported as places remaining rather than a bare refusal, because the admin
 * selects several files at once and needs to know how many to drop.
 */
export function checkPhotoBudget(
  existantes: number,
  ajoutees: number
): { ok: boolean; message?: string } {
  if (existantes + ajoutees <= MAX_PHOTOS_PER_ITEM) {
    return { ok: true };
  }

  const restantes = Math.max(0, MAX_PHOTOS_PER_ITEM - existantes);
  return {
    ok: false,
    message: `Un item ne peut pas depasser ${MAX_PHOTOS_PER_ITEM} photos. Il reste ${restantes} place(s).`,
  };
}
