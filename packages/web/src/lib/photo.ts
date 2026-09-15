export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const ACCEPTED = ['.jpg', '.jpeg', '.png', '.webp'];

/** iPhones hand these out from the photo library; browsers rarely render them. */
const APPLE_FORMATS = ['.heic', '.heif'];

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

/**
 * Check a photo before it is uploaded.
 *
 * The format is reported before the size: a HEIC picked on an iPhone is both
 * unsupported and often oversized, and "convert it" is the advice that actually
 * unblocks the user.
 */
export function validatePhotoFile(file: { name: string; size: number }): { ok: boolean; message?: string } {
  const ext = extensionOf(file.name);

  if (APPLE_FORMATS.includes(ext)) {
    return {
      ok: false,
      message: 'Format HEIC non pris en charge. Sur iPhone : Reglages > Appareil photo > Formats > "Plus compatible", ou choisissez un JPEG.',
    };
  }

  if (!ACCEPTED.includes(ext)) {
    return { ok: false, message: 'Format non pris en charge. Utilisez un JPG, un PNG ou un WebP.' };
  }

  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, message: 'La photo ne doit pas depasser 10 Mo.' };
  }

  return { ok: true };
}
