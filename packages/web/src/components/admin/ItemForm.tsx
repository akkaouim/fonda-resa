import { useState, useEffect, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { validatePhotoFile, MAX_PHOTOS_PER_ITEM } from '../../lib/photo';

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

  const [keptUrls, setKeptUrls] = useState<string[]>([]);
  const [removedUrls, setRemovedUrls] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

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
      setKeptUrls(item.photoUrls ?? []);
      setRemovedUrls([]);
      setPendingFiles([]);
    }
  }, [item]);

  const selectedCat = categories.find((c: any) => c.id === Number(form.categorieId));

  const totalPhotos = keptUrls.length + pendingFiles.length;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = '';
    if (chosen.length === 0) return;

    for (const file of chosen) {
      const check = validatePhotoFile(file);
      if (!check.ok) {
        alert(check.message);
        return;
      }
    }

    if (totalPhotos + chosen.length > MAX_PHOTOS_PER_ITEM) {
      alert(`Un item ne peut pas depasser ${MAX_PHOTOS_PER_ITEM} photos. Il reste ${MAX_PHOTOS_PER_ITEM - totalPhotos} place(s).`);
      return;
    }

    setPendingFiles((files) => [...files, ...chosen]);
  };

  const removeKept = (url: string) => {
    setKeptUrls((urls) => urls.filter((u) => u !== url));
    setRemovedUrls((urls) => [...urls, url]);
  };

  const removePending = (index: number) => {
    setPendingFiles((files) => files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    data._pendingPhotos = pendingFiles;
    data._removedPhotoUrls = removedUrls;
    onSave(data);
  };

  // Functional updater, not `{ ...form }`: the category select calls set()
  // twice in one handler, and a stale closure would make the second call
  // discard the first.
  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-border p-4 space-y-3">
      {/* Keyed on the id, not on the object: a duplicate arrives as a prefilled
          item with no id, and is an addition. */}
      <h2 className="font-medium">{item?.id ? 'Modifier l\'item' : 'Ajouter un item'}</h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Photo */}
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-sm">Photos <span className="text-muted-foreground">{totalPhotos}/{MAX_PHOTOS_PER_ITEM}</span></label>
          <div className="flex flex-wrap items-start gap-3">
            {keptUrls.map((url, i) => (
              <div key={url} className="relative">
                <img src={url} alt={`Photo ${i + 1}`} className="h-24 w-24 rounded-md border border-border object-cover" />
                <button type="button" onClick={() => removeKept(url)} aria-label={`Retirer la photo ${i + 1}`}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-white hover:bg-destructive/80">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {pendingFiles.map((file, i) => (
              <div key={`${file.name}-${i}`} className="relative">
                <img src={URL.createObjectURL(file)} alt={file.name} className="h-24 w-24 rounded-md border border-dashed border-primary object-cover" />
                <button type="button" onClick={() => removePending(i)} aria-label={`Retirer ${file.name}`}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-white hover:bg-destructive/80">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {totalPhotos === 0 && (
              <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed border-border bg-muted/50">
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={totalPhotos >= MAX_PHOTOS_PER_ITEM}
            className="mt-2 flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted disabled:opacity-50">
            <Upload className="h-4 w-4" /> Ajouter des photos
          </button>
          <p className="mt-1 text-xs text-muted-foreground">JPG, PNG ou WebP. 10 Mo max par photo.</p>
        </div>

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
          {isSaving ? 'Enregistrement...' : item?.id ? 'Modifier' : 'Creer'}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted">
          Annuler
        </button>
      </div>
    </form>
  );
}
