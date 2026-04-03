import { useState, useEffect } from 'react';

interface Props {
  item?: any;
  categories: any[];
  localisations: any[];
  onSave: (data: Record<string, any>) => void;
  isSaving: boolean;
  onCancel: () => void;
}

export default function ItemForm({ item, categories, localisations, onSave, isSaving, onCancel }: Props) {
  const [form, setForm] = useState({
    nom: '',
    description: '',
    categorieId: '' as string | number,
    sousCategorieId: '' as string | number,
    quantiteStock: 1,
    etat: 'bon',
    commentaireEtat: '',
    localisationId: '' as string | number,
    perimetreUtilisation: 'libre',
    marquage: '',
    typeItem: 'equipement',
    notes: '',
    valeurEstimee: '' as string | number,
  });

  useEffect(() => {
    if (item) {
      setForm({
        nom: item.nom || '',
        description: item.description || '',
        categorieId: item.categorieId || '',
        sousCategorieId: item.sousCategorieId || '',
        quantiteStock: item.quantiteStock || 1,
        etat: item.etat || 'bon',
        commentaireEtat: item.commentaireEtat || '',
        localisationId: item.localisationId || '',
        perimetreUtilisation: item.perimetreUtilisation || 'libre',
        marquage: item.marquage || '',
        typeItem: item.typeItem || 'equipement',
        notes: item.notes || '',
        valeurEstimee: item.valeurEstimee || '',
      });
    }
  }, [item]);

  const selectedCat = categories.find((c: any) => c.id === Number(form.categorieId));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, any> = {
      nom: form.nom,
      quantiteStock: Number(form.quantiteStock),
      etat: form.etat,
      perimetreUtilisation: form.perimetreUtilisation,
      typeItem: form.typeItem,
    };
    if (form.description) data.description = form.description;
    if (form.categorieId) data.categorieId = Number(form.categorieId);
    if (form.sousCategorieId) data.sousCategorieId = Number(form.sousCategorieId);
    if (form.commentaireEtat) data.commentaireEtat = form.commentaireEtat;
    if (form.localisationId) data.localisationId = Number(form.localisationId);
    if (form.marquage) data.marquage = form.marquage;
    if (form.notes) data.notes = form.notes;
    if (form.valeurEstimee) data.valeurEstimee = Number(form.valeurEstimee);
    onSave(data);
  };

  const set = (key: string, val: any) => setForm({ ...form, [key]: val });

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-border p-4 space-y-3">
      <h2 className="font-medium">{item ? 'Modifier l\'item' : 'Ajouter un item'}</h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-sm">Nom *</label>
          <input required value={form.nom} onChange={(e) => set('nom', e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div>
          <label className="mb-1 block text-sm">Categorie</label>
          <select value={form.categorieId} onChange={(e) => { set('categorieId', e.target.value); set('sousCategorieId', ''); }}
            className="w-full rounded-md border border-input px-3 py-2 text-sm">
            <option value="">—</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm">Sous-categorie</label>
          <select value={form.sousCategorieId} onChange={(e) => set('sousCategorieId', e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm" disabled={!selectedCat?.sousCategories?.length}>
            <option value="">—</option>
            {selectedCat?.sousCategories?.map((s: any) => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm">Quantite en stock *</label>
          <input type="number" min={0} required value={form.quantiteStock} onChange={(e) => set('quantiteStock', e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div>
          <label className="mb-1 block text-sm">Etat</label>
          <select value={form.etat} onChange={(e) => set('etat', e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm">
            <option value="bon">Bon</option>
            <option value="usage">Usage</option>
            <option value="a_reparer">A reparer</option>
            <option value="hors_service">Hors service</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm">Localisation</label>
          <select value={form.localisationId} onChange={(e) => set('localisationId', e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm">
            <option value="">—</option>
            {localisations.map((l: any) => <option key={l.id} value={l.id}>{l.nom}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm">Perimetre</label>
          <select value={form.perimetreUtilisation} onChange={(e) => set('perimetreUtilisation', e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm">
            <option value="libre">Libre (peut sortir du site)</option>
            <option value="sur_le_site">Sur le site (reste a l'Esviere)</option>
            <option value="sur_place">Sur place (ne quitte pas sa salle)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm">Type</label>
          <select value={form.typeItem} onChange={(e) => set('typeItem', e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm">
            <option value="equipement">Equipement (retour attendu)</option>
            <option value="consommable">Consommable (pas de retour)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm">Marquage</label>
          <input value={form.marquage} onChange={(e) => set('marquage', e.target.value)} placeholder="Couleur, n° serie..."
            className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div>
          <label className="mb-1 block text-sm">Valeur estimee (euros)</label>
          <input type="number" min={0} step={0.01} value={form.valeurEstimee} onChange={(e) => set('valeurEstimee', e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm">Commentaire etat</label>
          <input value={form.commentaireEtat} onChange={(e) => set('commentaireEtat', e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-sm">Description / Notes</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
            className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={isSaving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {isSaving ? 'Enregistrement...' : item ? 'Modifier' : 'Creer'}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted">
          Annuler
        </button>
      </div>
    </form>
  );
}
