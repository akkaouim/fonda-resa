import { useState } from 'react';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import { useLocalisations, useCreateLocalisation, useUpdateLocalisation, useDeleteLocalisation } from '../../hooks/useItems';

type Localisation = {
  id: number;
  nom: string;
  estSurSite: boolean;
  description?: string | null;
  _count?: { items: number };
};

type Draft = { nom: string; estSurSite: boolean; description: string };

const EMPTY: Draft = { nom: '', estSurSite: true, description: '' };

type ApiError = { response?: { data?: { error?: { message?: string } } } };

function errMsg(error: unknown, fallback = 'Une erreur est survenue') {
  return (error as ApiError)?.response?.data?.error?.message || fallback;
}

export default function LocalisationsPanel({ onClose }: { onClose: () => void }) {
  const { data: localisations, isLoading } = useLocalisations();
  const createLoc = useCreateLocalisation();
  const updateLoc = useUpdateLocalisation();
  const deleteLoc = useDeleteLocalisation();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [newLoc, setNewLoc] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (loc: Localisation) => {
    setEditingId(loc.id);
    setDraft({ nom: loc.nom, estSurSite: loc.estSurSite, description: loc.description || '' });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(EMPTY);
    setError(null);
  };

  const saveEdit = () => {
    if (!draft.nom.trim()) return;
    setError(null);
    updateLoc.mutate(
      { id: editingId!, nom: draft.nom.trim(), estSurSite: draft.estSurSite, description: draft.description.trim() || undefined },
      { onSuccess: cancelEdit, onError: (e) => setError(errMsg(e, 'Modification impossible')) }
    );
  };

  const addLoc = () => {
    if (!newLoc.nom.trim()) return;
    setError(null);
    createLoc.mutate(
      { nom: newLoc.nom.trim(), estSurSite: newLoc.estSurSite, description: newLoc.description.trim() || undefined },
      { onSuccess: () => setNewLoc(EMPTY), onError: (e) => setError(errMsg(e, 'Creation impossible')) }
    );
  };

  const removeLoc = (loc: Localisation) => {
    setError(null);
    if (!confirm(`Supprimer la localisation "${loc.nom}" ?`)) return;
    deleteLoc.mutate(loc.id, {
      onError: (e) => setError(errMsg(e, 'Suppression impossible')),
    });
  };

  return (
    <div className="mb-6 rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">Localisations</h2>
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
          {localisations?.map((loc: Localisation) => {
            const count = loc._count?.items ?? 0;
            const isEditing = editingId === loc.id;

            if (isEditing) {
              return (
                <li key={loc.id} className="flex flex-wrap items-center gap-2 py-2">
                  <input autoFocus value={draft.nom} onChange={(e) => setDraft({ ...draft, nom: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                    className="flex-1 min-w-40 rounded-md border border-input px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <input value={draft.description} placeholder="Description (optionnelle)"
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    className="flex-1 min-w-40 rounded-md border border-input px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <input type="checkbox" checked={draft.estSurSite}
                      onChange={(e) => setDraft({ ...draft, estSurSite: e.target.checked })} />
                    Sur site
                  </label>
                  <button onClick={saveEdit} disabled={!draft.nom.trim() || updateLoc.isPending}
                    className="rounded-md p-1.5 text-primary hover:bg-muted disabled:opacity-50" aria-label="Enregistrer">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={cancelEdit} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Annuler">
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            }

            return (
              <li key={loc.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <span className="text-sm">{loc.nom}</span>
                  {!loc.estSurSite && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Hors site</span>
                  )}
                  {loc.description && (
                    <p className="truncate text-xs text-muted-foreground">{loc.description}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {count === 0 ? 'Vide' : `${count} materiel${count > 1 ? 's' : ''}`}
                </span>
                <button onClick={() => startEdit(loc)} className="rounded-md p-1.5 hover:bg-muted" aria-label={`Modifier ${loc.nom}`}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => removeLoc(loc)} disabled={count > 0 || deleteLoc.isPending}
                  title={count > 0 ? `Impossible : ${count} materiel${count > 1 ? 's y sont ranges' : ' y est range'}` : 'Supprimer'}
                  className="rounded-md p-1.5 text-destructive hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={`Supprimer ${loc.nom}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <input value={newLoc.nom} placeholder="Nouvelle localisation"
          onChange={(e) => setNewLoc({ ...newLoc, nom: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') addLoc(); }}
          className="flex-1 min-w-40 rounded-md border border-input px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input value={newLoc.description} placeholder="Description (optionnelle)"
          onChange={(e) => setNewLoc({ ...newLoc, description: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') addLoc(); }}
          className="flex-1 min-w-40 rounded-md border border-input px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input type="checkbox" checked={newLoc.estSurSite}
            onChange={(e) => setNewLoc({ ...newLoc, estSurSite: e.target.checked })} />
          Sur site
        </label>
        <button onClick={addLoc} disabled={!newLoc.nom.trim() || createLoc.isPending}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>
    </div>
  );
}
