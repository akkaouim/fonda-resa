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
