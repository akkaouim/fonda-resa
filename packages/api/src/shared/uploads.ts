import path from 'path';

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

export const PHOTO_URL_PREFIX = '/uploads/photos/';

/**
 * Extract the on-disk filename a photo URL refers to, or null if the URL is
 * not one we served.
 *
 * The URL to delete comes from the client, so without this check the delete
 * route would unlink any file the process can reach.
 */
export function photoFilenameFromUrl(url: string): string | null {
  if (!url.startsWith(PHOTO_URL_PREFIX)) return null;

  const filename = url.slice(PHOTO_URL_PREFIX.length);
  if (!filename) return null;
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) return null;

  return filename;
}

/**
 * Erase files multer already wrote when the request is going to be refused.
 *
 * multer writes to disk while parsing, so a refusal that skipped this would
 * leave behind exactly the orphans the photo routes exist to avoid. The unlink
 * is injected so this rule can be tested without touching a filesystem.
 */
export async function discardUploadedFiles(
  files: { path: string }[],
  unlink: (path: string) => Promise<void>
): Promise<void> {
  await Promise.all(
    files.map((file) => unlink(file.path).catch(() => { /* already gone */ }))
  );
}

/**
 * Resolve the uploads directory from a setting and the caller's own location.
 *
 * Anchored to the calling module, never to `process.cwd()`: `npm run dev:api`
 * runs with the working directory at packages/api while the container runs it
 * at the repo root, so a cwd-relative setting resolves to two different places.
 *
 * `configDir` is always <root>/packages/api/{src,dist}/config, hence four
 * levels up to reach the repository root in either layout.
 *
 * It lives here, in a module that imports nothing, rather than beside the
 * value it computes: config/paths.ts pulls in config/env.ts, which validates
 * the environment and exits the process when a variable is missing. A test
 * importing it would die on a machine with no .env — as CI did.
 */
export function resolveUploadsRoot(setting: string, configDir: string): string {
  if (path.isAbsolute(setting)) return setting;
  return path.resolve(configDir, '../../../..', setting);
}
