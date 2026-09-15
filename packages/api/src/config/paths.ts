import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';
import { resolveUploadsRoot } from '../shared/uploads.js';

const configDir = path.dirname(fileURLToPath(import.meta.url));

/** The one uploads directory. Every reader and writer must use these. */
export const UPLOADS_ROOT = resolveUploadsRoot(env.UPLOAD_DIR, configDir);
export const PHOTOS_DIR = path.join(UPLOADS_ROOT, 'photos');
