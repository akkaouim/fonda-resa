import { describe, it, expect } from 'vitest';
import { MAX_PHOTO_BYTES, MAX_PHOTOS_PER_ITEM, checkPhotoBudget, photoFilenameFromUrl, discardUploadedFiles, multerErrorMessage } from '../shared/uploads.js';

describe('MAX_PHOTO_BYTES', () => {
  it('is 10 Mo', () => {
    expect(MAX_PHOTO_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe('multerErrorMessage', () => {
  it('states the limit when the file is too large', () => {
    const message = multerErrorMessage('LIMIT_FILE_SIZE');
    expect(message).toContain('10 Mo');
  });

  it('falls back to a plain message for any other upload failure', () => {
    const message = multerErrorMessage('LIMIT_UNEXPECTED_FILE');
    expect(message).toBeTruthy();
    expect(message).not.toContain('10 Mo');
  });
});

describe('checkPhotoBudget', () => {
  it('allows filling the budget exactly', () => {
    expect(checkPhotoBudget(0, MAX_PHOTOS_PER_ITEM).ok).toBe(true);
  });

  it('allows adding to a partly filled item', () => {
    expect(checkPhotoBudget(4, 2).ok).toBe(true);
  });

  it('refuses going over the budget', () => {
    const result = checkPhotoBudget(5, 2);
    expect(result.ok).toBe(false);
  });

  it('states the limit and what is left', () => {
    const result = checkPhotoBudget(5, 2);
    expect(result.message).toContain('6');
    expect(result.message).toContain('1');
  });

  it('refuses when the item is already full', () => {
    expect(checkPhotoBudget(MAX_PHOTOS_PER_ITEM, 1).ok).toBe(false);
  });

  it('allows adding nothing to a full item', () => {
    expect(checkPhotoBudget(MAX_PHOTOS_PER_ITEM, 0).ok).toBe(true);
  });
});

describe('photoFilenameFromUrl', () => {
  it('returns the filename of a photo we served', () => {
    expect(photoFilenameFromUrl('/uploads/photos/1757890-ab12.jpg')).toBe('1757890-ab12.jpg');
  });

  it('refuses a path that escapes the photo directory', () => {
    expect(photoFilenameFromUrl('/uploads/photos/../../.env')).toBeNull();
  });

  it('refuses a nested path', () => {
    expect(photoFilenameFromUrl('/uploads/photos/sub/photo.jpg')).toBeNull();
  });

  it('refuses a URL served from anywhere else', () => {
    expect(photoFilenameFromUrl('/etc/passwd')).toBeNull();
  });

  it('refuses an empty filename', () => {
    expect(photoFilenameFromUrl('/uploads/photos/')).toBeNull();
  });

  it('refuses a backslash, which Windows would treat as a separator', () => {
    expect(photoFilenameFromUrl('/uploads/photos/..\\secret')).toBeNull();
  });
});

describe('discardUploadedFiles', () => {
  it('unlinks every file it was given', async () => {
    const erased: string[] = [];

    await discardUploadedFiles(
      [{ path: '/tmp/a.jpg' }, { path: '/tmp/b.jpg' }],
      async (p) => { erased.push(p); }
    );

    expect(erased).toEqual(['/tmp/a.jpg', '/tmp/b.jpg']);
  });

  it('keeps erasing the others when one file is already gone', async () => {
    const erased: string[] = [];

    await discardUploadedFiles(
      [{ path: '/tmp/a.jpg' }, { path: '/tmp/b.jpg' }],
      async (p) => {
        if (p === '/tmp/a.jpg') throw new Error('ENOENT');
        erased.push(p);
      }
    );

    expect(erased).toEqual(['/tmp/b.jpg']);
  });

  it('does nothing when there is nothing to discard', async () => {
    await expect(discardUploadedFiles([], async () => { throw new Error('should not run'); })).resolves.toBeUndefined();
  });
});
