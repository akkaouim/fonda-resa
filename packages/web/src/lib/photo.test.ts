import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validatePhotoFile, MAX_PHOTO_BYTES, syncItemPhotos } from './photo';

vi.mock('./api', () => ({
  api: { post: vi.fn(), delete: vi.fn() },
}));
import { api } from './api';

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

describe('syncItemPhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: {} } } as never);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true, data: {} } } as never);
  });

  it('deletes each removed photo', async () => {
    await syncItemPhotos(7, ['/uploads/photos/a.jpg', '/uploads/photos/b.jpg'], []);

    expect(vi.mocked(api.delete)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.delete).mock.calls[0][0]).toBe('/items/7/photos');
  });

  it('sends every new file in a single request', async () => {
    const files = [new File(['x'], 'a.jpg'), new File(['y'], 'b.jpg')];

    await syncItemPhotos(7, [], files);

    expect(vi.mocked(api.post)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api.post).mock.calls[0][0]).toBe('/items/7/photos');
  });

  it('deletes before adding, so replacing a full gallery fits the budget', async () => {
    const order: string[] = [];
    vi.mocked(api.delete).mockImplementation((async () => { order.push('delete'); return { data: {} }; }) as never);
    vi.mocked(api.post).mockImplementation((async () => { order.push('post'); return { data: {} }; }) as never);

    await syncItemPhotos(7, ['/uploads/photos/a.jpg'], [new File(['x'], 'b.jpg')]);

    expect(order).toEqual(['delete', 'post']);
  });

  it('sends nothing when there is nothing to change', async () => {
    await syncItemPhotos(7, [], []);

    expect(vi.mocked(api.post)).not.toHaveBeenCalled();
    expect(vi.mocked(api.delete)).not.toHaveBeenCalled();
  });
});
