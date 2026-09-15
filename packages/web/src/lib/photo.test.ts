import { describe, it, expect } from 'vitest';
import { validatePhotoFile, MAX_PHOTO_BYTES } from './photo';

const file = (name: string, size = 1024) => ({ name, size });

describe('MAX_PHOTO_BYTES', () => {
  it('is 10 Mo', () => {
    expect(MAX_PHOTO_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe('validatePhotoFile', () => {
  it('accepts the supported formats', () => {
    for (const name of ['photo.jpg', 'photo.jpeg', 'photo.png', 'photo.webp']) {
      expect(validatePhotoFile(file(name)).ok).toBe(true);
    }
  });

  it('ignores the case of the extension', () => {
    expect(validatePhotoFile(file('PHOTO.JPG')).ok).toBe(true);
  });

  it('names HEIC specifically, since iPhones produce it', () => {
    const result = validatePhotoFile(file('IMG_4821.heic'));
    expect(result.ok).toBe(false);
    expect(result.message).toContain('HEIC');
    expect(result.message).toContain('JPEG');
  });

  it('rejects HEIF the same way', () => {
    expect(validatePhotoFile(file('IMG_4821.heif')).ok).toBe(false);
  });

  it('rejects an unsupported format', () => {
    const result = validatePhotoFile(file('notice.pdf'));
    expect(result.ok).toBe(false);
    expect(result.message).toContain('JPG');
  });

  it('accepts a file of exactly the limit', () => {
    expect(validatePhotoFile(file('photo.jpg', MAX_PHOTO_BYTES)).ok).toBe(true);
  });

  it('rejects a file over the limit', () => {
    const result = validatePhotoFile(file('photo.jpg', MAX_PHOTO_BYTES + 1));
    expect(result.ok).toBe(false);
    expect(result.message).toContain('10 Mo');
  });

  it('reports the format before the size, as the format is the actionable one', () => {
    const result = validatePhotoFile(file('IMG_4821.heic', MAX_PHOTO_BYTES * 2));
    expect(result.message).toContain('HEIC');
  });
});
