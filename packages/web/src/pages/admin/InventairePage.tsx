import { useState } from 'react';
import { useItems, useCategories, useLocalisations, useCreateItem, useUpdateItem, useDeleteItem, useImportItems } from '../../hooks/useItems';
import { Search, Plus, X, Upload, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import ItemForm from '../../components/admin/ItemForm';
import ImportWizard from '../../components/admin/ImportWizard';
import ItemDetail from '../../components/materiel/ItemDetail';

export default function InventairePage() {
  const [search, setSearch] = useState('');
  const [categorieId, setCategorieId] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showImport, setShowImport] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading } = useItems({ search: search || undefined, categorieId, page, limit: 50 });
  const { data: categories } = useCategories();
  const { data: localisations } = useLocalisations();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const importItems = useImportItems();

  const handleSave = (formData: Record<string, any>) => {
    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, ...formData }, {
        onSuccess: () => { setEditingItem(null); setShowForm(false); },
      });
    } else {
      createItem.mutate(formData, {
        onSuccess: () => setShowForm(false),
      });
    }
  };

  const handleEdit = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setShowForm(true);
    setExpandedId(null);
  };

  const handleDelete = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Supprimer "${item.nom}" ?`)) {
      deleteItem.mutate(item.id);
    }
  };

  const toggleExpand = (id: number) => setExpandedId(expandedId === id ? null : id);

  return (
    <div className="p-4 pb-20 lg:p-6 lg:pb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Inventaire</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(!showImport)}
            className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted">
            <Upload className="h-4 w-4" /> Importer
          </button>
          <button onClick={() => { setEditingItem(null); setShowForm(!showForm); setExpandedId(null); }}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Fermer' : 'Ajouter'}
          </button>
        </div>
      </div>

      {showImport && (
        <ImportWizard onImport={(rows) => importItems.mutateAsync(rows)} isLoading={importItems.isPending}
          result={importItems.data} onClose={() => { setShowImport(false); importItems.reset(); }} />
      )}

      {showForm && (
        <ItemForm item={editingItem} categories={categories || []} localisations={localisations || []}
          onSave={handleSave} isSaving={createItem.isPending || updateItem.isPending}
          onCancel={() => { setShowForm(false); setEditingItem(null); }} />
      )}

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-md border border-input pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={categorieId || ''} onChange={(e) => { setCategorieId(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="rounded-md border border-input px-3 py-1.5 text-sm">
          <option value="">Toutes categories</option>
          {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      </div>

      {data && <p className="mb-2 text-sm text-muted-foreground">{data.total} items</p>}

      {isLoading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="w-8 px-2 py-2"></th>
                <th className="px-3 py-2 font-medium">Nom</th>
                <th className="px-3 py-2 font-medium">Categorie</th>
                <th className="px-3 py-2 font-medium text-center">Stock</th>
                <th className="px-3 py-2 font-medium">Etat</th>
                <th className="px-3 py-2 font-medium">Localisation</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((item: any) => {
                const expanded = expandedId === item.id;
                return (
                  <>
                    <tr key={item.id} onClick={() => toggleExpand(item.id)}
                      className="border-t border-border cursor-pointer hover:bg-muted/50">
                      <td className="px-2 py-2 text-muted-foreground">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{item.nom}</div>
                        {item.marquage && <div className="text-xs text-muted-foreground">{item.marquage}</div>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">
                        {item.categorie?.nom}{item.sousCategorie ? ` / ${item.sousCategorie.nom}` : ''}
                      </td>
                      <td className="px-3 py-2 text-center font-medium">{item.quantiteStock}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.etat === 'bon' ? 'bg-green-100 text-green-800' :
                          item.etat === 'usage' ? 'bg-yellow-100 text-yellow-800' :
                          item.etat === 'a_reparer' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>{item.etat}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{item.localisation?.nom || '—'}</td>
                      <td className="px-3 py-2 text-xs">{item.typeItem === 'consommable' ? 'Conso' : 'Equip'}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={(e) => handleEdit(item, e)} className="mr-2 text-primary hover:text-primary/80" title="Modifier">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={(e) => handleDelete(item, e)} className="text-destructive hover:text-destructive/80" title="Supprimer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr key={`${item.id}-detail`} className="border-t border-border bg-muted/30">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <ItemDetail item={item} />
                            </div>
                            <button
                              onClick={(e) => handleEdit(item, e)}
                              className="flex shrink-0 items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm text-primary hover:bg-primary/10"
                            >
                              <Pencil className="h-4 w-4" /> Modifier
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
