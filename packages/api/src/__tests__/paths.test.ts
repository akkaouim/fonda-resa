import { describe, it, expect } from 'vitest';
import { resolveUploadsRoot } from '../shared/uploads.js';

// Where config/paths.{ts,js} sits in each layout.
const SRC_LAYOUT = '/srv/fonda-resa/packages/api/src/config';
const DIST_LAYOUT = '/srv/fonda-resa/packages/api/dist/config';

describe('resolveUploadsRoot', () => {
  it('keeps an absolute setting as it is', () => {
    expect(resolveUploadsRoot('/var/data/uploads', SRC_LAYOUT)).toBe('/var/data/uploads');
  });

  it('resolves a relative setting against the repository root', () => {
    expect(resolveUploadsRoot('./uploads', SRC_LAYOUT)).toBe('/srv/fonda-resa/uploads');
  });

  it('accepts a setting written without a leading dot', () => {
    expect(resolveUploadsRoot('uploads', SRC_LAYOUT)).toBe('/srv/fonda-resa/uploads');
  });

  it('gives the same answer from the compiled layout as from the sources', () => {
    // This is the bug: writing resolved against process.cwd() while reading
    // resolved against the module location, so `npm run dev:api` (cwd at
    // packages/api) and the container (cwd at the root) disagreed.
    expect(resolveUploadsRoot('./uploads', DIST_LAYOUT)).toBe(
      resolveUploadsRoot('./uploads', SRC_LAYOUT)
    );
  });

  it('never depends on the current working directory', () => {
    const before = process.cwd();
    process.chdir('/tmp');
    try {
      expect(resolveUploadsRoot('./uploads', SRC_LAYOUT)).toBe('/srv/fonda-resa/uploads');
    } finally {
      process.chdir(before);
    }
  });
});
