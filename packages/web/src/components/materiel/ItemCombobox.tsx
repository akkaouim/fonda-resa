import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface Props {
  items: any[];
  value: number;
  onChange: (id: number) => void;
  placeholder?: string;
  showStock?: boolean;
}

function itemHaystack(item: any) {
  return [
    item.nom,
    item.marquage,
    item.categorie?.nom,
    item.sousCategorie?.nom,
    item.localisation?.nom,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function itemMeta(item: any) {
  const parts: string[] = [];
  if (item.categorie?.nom) {
    parts.push(item.sousCategorie?.nom ? `${item.categorie.nom} / ${item.sousCategorie.nom}` : item.categorie.nom);
  }
  return parts.join(' · ');
}

/**
 * Type-to-filter combobox for picking an item by name or category.
 */
export default function ItemCombobox({ items, value, onChange, placeholder = '-- Item --', showStock }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => items.find((i) => i.id === value), [items, value]);

  // When the input isn't being edited, show the selected item's name.
  useEffect(() => {
    if (!open) setQuery(selected ? selected.nom : '');
  }, [selected, open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // While a selection is shown (query === selected name) and the dropdown just opened,
    // list everything so the user can browse; otherwise filter by the typed text.
    if (!q || (selected && q === selected.nom.toLowerCase())) return items;
    return items.filter((i) => itemHaystack(i).includes(q));
  }, [items, query, selected]);

  useEffect(() => {
    if (highlight >= filtered.length) setHighlight(0);
  }, [filtered.length, highlight]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const select = (item: any) => {
    onChange(item.id);
    setQuery(item.nom);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && filtered[highlight]) {
        e.preventDefault();
        select(filtered[highlight]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-md border border-input bg-background px-3 py-2 pl-9 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange(0);
              setQuery('');
              setOpen(false);
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Effacer"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>

      {open && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-background py-1 shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Aucun item trouve</li>
          ) : (
            filtered.slice(0, 100).map((item, i) => {
              const meta = itemMeta(item);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(item)}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                      i === highlight ? 'bg-muted' : ''
                    } ${item.id === value ? 'text-primary' : ''}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.nom}</span>
                      {meta && <span className="block truncate text-xs text-muted-foreground">{meta}</span>}
                    </span>
                    {showStock && (
                      <span className="shrink-0 text-xs text-muted-foreground">stock: {item.quantiteStock}</span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
