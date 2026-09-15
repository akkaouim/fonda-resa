import { describe, it, expect } from 'vitest';
import { MAX_PHOTO_BYTES, MAX_PHOTOS_PER_ITEM, checkPhotoBudget, multerErrorMessage } from '../shared/uploads.js';

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
