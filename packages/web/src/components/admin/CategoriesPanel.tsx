import { useState } from 'react';
import { Pencil, Trash2, Plus, Check, X, ChevronRight, ChevronDown } from 'lucide-react';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateSubCategory,
  useUpdateSubCategory,
  useDeleteSubCategory,
} from '../../hooks/useItems';

type SousCategorie = {
  id: number;
  nom: string;
  categorieId: number;
  _count?: { items: number };
};

type Categorie = {
  id: number;
  nom: string;
  sousCategories?: SousCategorie[];
  _count?: { items: number };
};

type ApiError = { response?: { data?: { error?: { message?: string } } } };

function errMsg(error: unknown, fallback = 'Une erreur est survenue') {
  return (error as ApiError)?.response?.data?.error?.message || fallback;
}

function countText(n: number, singular: string) {
  return `${n} ${singular}${n > 1 ? 's' : ''}`;
}

export default function CategoriesPanel({ onClose }: { onClose: () => void }) {
  const { data: categories, isLoading } = useCategories();
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();
  const createSous = useCreateSubCategory();
  const updateSous = useUpdateSubCategory();
  const deleteSous = useDeleteSubCategory();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingSousId, setEditingSousId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newSous, setNewSous] = useState('');
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
    setNewSous('');
    setEditingSousId(null);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingCatId(null);
    setEditingSousId(null);
    setDraft('');
    setError(null);
  };

  const saveCat = () => {
    if (!draft.trim()) return;
    setError(null);
    updateCat.mutate({ id: editingCatId!, nom: draft.trim() }, {
      onSuccess: cancelEdit,
      onError: (e) => setError(errMsg(e, 'Renommage impossible')),
    });
  };

  const saveSous = (categorieId: number) => {
    if (!draft.trim()) return;
    setError(null);
    updateSous.mutate({ id: editingSousId!, nom: draft.trim(), categorieId }, {
      onSuccess: cancelEdit,
      onError: (e) => setError(errMsg(e, 'Renommage impossible')),
    });
  };

  const addCat = () => {
    if (!newCat.trim()) return;
    setError(null);
    createCat.mutate(newCat.trim(), {
      onSuccess: () => setNewCat(''),
      onError: (e) => setError(errMsg(e, 'Creation impossible')),
    });
  };

  const addSous = (categorieId: number) => {
    if (!newSous.trim()) return;
    setError(null);
    createSous.mutate({ nom: newSous.trim(), categorieId }, {
      onSuccess: () => setNewSous(''),
      onError: (e) => setError(errMsg(e, 'Creation impossible')),
    });
  };

  const removeCat = (cat: Categorie) => {
    setError(null);
    if (!confirm(`Supprimer la categorie "${cat.nom}" ?`)) return;
    deleteCat.mutate(cat.id, { onError: (e) => setError(errMsg(e, 'Suppression impossible')) });
  };

  const removeSous = (sous: SousCategorie) => {
    setError(null);
    if (!confirm(`Supprimer la sous-categorie "${sous.nom}" ?`)) return;
    deleteSous.mutate(sous.id, { onError: (e) => setError(errMsg(e, 'Suppression impossible')) });
  };

  const editBox = (onSave: () => void) => (
    <>
      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') cancelEdit(); }}
        className="flex-1 min-w-32 rounded-md border border-input px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      <button onClick={onSave} disabled={!draft.trim()}
        className="rounded-md p-1.5 text-primary hover:bg-muted disabled:opacity-50" aria-label="Enregistrer">
        <Check className="h-4 w-4" />
      </button>
      <button onClick={cancelEdit} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Annuler">
        <X className="h-4 w-4" />
      </button>
    </>
  );

  return (
    <div className="mb-6 rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">Categories</h2>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Fermer">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : (
        <ul className="divide-y divide-border">
          {(categories as Categorie[] | undefined)?.map((cat) => {
            const sousList = cat.sousCategories ?? [];
            const itemCount = cat._count?.items ?? 0;
            const blocked = itemCount > 0 || sousList.length > 0;
            const expanded = expandedId === cat.id;

            return (
              <li key={cat.id} className="py-1">
                <div className="flex items-center gap-2 py-1">
                  <button onClick={() => toggle(cat.id)} className="rounded-md p-1 hover:bg-muted"
                    aria-label={expanded ? `Replier ${cat.nom}` : `Deplier ${cat.nom}`}>
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>

                  {editingCatId === cat.id ? editBox(saveCat) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-sm">{cat.nom}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {sousList.length > 0 && `${countText(sousList.length, 'sous-categorie')} · `}
                        {countText(itemCount, 'materiel')}
                      </span>
                      <button onClick={() => { setEditingCatId(cat.id); setEditingSousId(null); setDraft(cat.nom); setError(null); }}
                        className="rounded-md p-1.5 hover:bg-muted" aria-label={`Renommer ${cat.nom}`}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => removeCat(cat)} disabled={blocked || deleteCat.isPending}
                        title={blocked ? 'Videz la categorie avant de la supprimer' : 'Supprimer'}
                        className="rounded-md p-1.5 text-destructive hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Supprimer ${cat.nom}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>

                {expanded && (
                  <ul className="ml-7 border-l border-border pl-3">
                    {sousList.map((sous) => {
                      const sousItems = sous._count?.items ?? 0;
                      return (
                        <li key={sous.id} className="flex items-center gap-2 py-1">
                          {editingSousId === sous.id ? editBox(() => saveSous(cat.id)) : (
                            <>
                              <span className="min-w-0 flex-1 truncate text-sm">{sous.nom}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">{countText(sousItems, 'materiel')}</span>
                              <button onClick={() => { setEditingSousId(sous.id); setEditingCatId(null); setDraft(sous.nom); setError(null); }}
                                className="rounded-md p-1.5 hover:bg-muted" aria-label={`Renommer ${sous.nom}`}>
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => removeSous(sous)} disabled={sousItems > 0 || deleteSous.isPending}
                                title={sousItems > 0 ? 'Retirez les materiels avant de supprimer' : 'Supprimer'}
                                className="rounded-md p-1.5 text-destructive hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label={`Supprimer ${sous.nom}`}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </li>
                      );
                    })}

                    <li className="flex items-center gap-2 py-1">
                      <input value={newSous} placeholder="Nouvelle sous-categorie"
                        onChange={(e) => setNewSous(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addSous(cat.id); }}
                        aria-label={`Nouvelle sous-categorie dans ${cat.nom}`}
                        className="flex-1 min-w-32 rounded-md border border-input px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      <button onClick={() => addSous(cat.id)} disabled={!newSous.trim() || createSous.isPending}
                        className="rounded-md p-1.5 text-primary hover:bg-muted disabled:opacity-50"
                        aria-label={`Ajouter une sous-categorie dans ${cat.nom}`}>
                        <Plus className="h-4 w-4" />
                      </button>
                    </li>
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <input value={newCat} placeholder="Nouvelle categorie"
          onChange={(e) => setNewCat(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addCat(); }}
          aria-label="Nouvelle categorie"
          className="flex-1 min-w-40 rounded-md border border-input px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={addCat} disabled={!newCat.trim() || createCat.isPending}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>
    </div>
  );
}
