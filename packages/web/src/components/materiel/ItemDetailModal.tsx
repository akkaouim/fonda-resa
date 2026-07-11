import { X } from 'lucide-react';
import ItemDetail from './ItemDetail';

interface Props {
  item: any;
  onClose: () => void;
}

export default function ItemDetailModal({ item, onClose }: Props) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-background p-5 shadow-lg">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
        <ItemDetail item={item} />
      </div>
    </div>
  );
}
