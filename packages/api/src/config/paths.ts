import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';

/**
 * Resolve the uploads directory from a setting and this module's own location.
 *
 * Anchored to the module, never to `process.cwd()`. `npm run dev:api` runs with
 * the working directory at packages/api while the container runs it at the repo
 * root, so a cwd-relative setting resolves to two different places — which is
 * how photos came to be written somewhere other than where they were served.
 *
 * `configDir` is always <root>/packages/api/{src,dist}/config, hence four levels
 * up to reach the repository root in either layout.
 */
export function resolveUploadsRoot(setting: string, configDir: string): string {
  if (path.isAbsolute(setting)) return setting;
  return path.resolve(configDir, '../../../..', setting);
}

const configDir = path.dirname(fileURLToPath(import.meta.url));

/** The one uploads directory. Every reader and writer must use these. */
export const UPLOADS_ROOT = resolveUploadsRoot(env.UPLOAD_DIR, configDir);
export const PHOTOS_DIR = path.join(UPLOADS_ROOT, 'photos');
