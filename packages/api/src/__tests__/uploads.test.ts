import { describe, it, expect } from 'vitest';
import { MAX_PHOTO_BYTES, multerErrorMessage } from '../shared/uploads.js';

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
