import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  photos: string[];
  index: number;
  alt: string;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

/**
 * Full-screen viewer showing one photo at its natural proportions.
 *
 * Rendered through a portal: an ancestor with a CSS transform would become the
 * containing block for `position: fixed` and trap the overlay inside a table
 * row. It also sits above ItemDetailModal, which is z-50.
 *
 * Navigation wraps around — with at most six photos, arrows that dead-end at
 * the edges cost more than they explain.
 */
export default function PhotoLightbox({ photos, index, alt, onNavigate, onClose }: Props) {
  const count = photos.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose();
      if (count < 2) return;
      if (e.key === 'ArrowRight') onNavigate((index + 1) % count);
      if (e.key === 'ArrowLeft') onNavigate((index - 1 + count) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, count, onNavigate, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <button type="button" onClick={onClose} aria-label="Fermer la visionneuse"
        className="absolute inset-0 cursor-default bg-black/80" />

      <button type="button" onClick={onClose} aria-label="Fermer"
        className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70">
        <X className="h-5 w-5" />
      </button>

      {count > 1 && (
        <>
          <button type="button" onClick={() => onNavigate((index - 1 + count) % count)} aria-label="Photo precedente"
            className="absolute left-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button type="button" onClick={() => onNavigate((index + 1) % count)} aria-label="Photo suivante"
            className="absolute right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70">
            <ChevronRight className="h-6 w-6" />
          </button>
          <p className="absolute bottom-4 z-10 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
            {index + 1} / {count}
          </p>
        </>
      )}

      <img src={photos[index]} alt={`${alt} en grand`}
        className="relative z-10 max-h-[90vh] max-w-[90vw] object-contain" />
    </div>,
    document.body
  );
}
