import { useState } from 'react';
import { useItems, useCategories, useLocalisations } from '../../hooks/useItems';
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MapPin, Tag } from 'lucide-react';
import ItemDetail from '../../components/materiel/ItemDetail';

const ETAT_LABELS: Record<string, { label: string; color: string }> = {
  bon: { label: 'Bon', color: 'bg-green-100 text-green-800' },
  usage: { label: 'Usage', color: 'bg-yellow-100 text-yellow-800' },
  a_reparer: { label: 'A reparer', color: 'bg-orange-100 text-orange-800' },
  hors_service: { label: 'Hors service', color: 'bg-red-100 text-red-800' },
};

const PERIMETRE_LABELS: Record<string, { label: string; color: string }> = {
  libre: { label: 'Libre', color: 'bg-green-100 text-green-800' },
  sur_le_site: { label: 'Sur le site', color: 'bg-blue-100 text-blue-800' },
  sur_place: { label: 'Sur place', color: 'bg-orange-100 text-orange-800' },
};

export default function MaterielPage() {
  const [search, setSearch] = useState('');
  const [categorieId, setCategorieId] = useState<number | undefined>();
  const [etat, setEtat] = useState<string | undefined>();
  const [typeItem, setTypeItem] = useState<string | undefined>();
  const [localisationId, setLocalisationId] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading } = useItems({ search: search || undefined, categorieId, etat, typeItem, localisationId, page, limit: 20 });
  const { data: categories } = useCategories();
  const { data: localisations } = useLocalisations();

  const toggleExpand = (id: number) => setExpandedId(expandedId === id ? null : id);

  return (
    <div className="p-4 pb-20 lg:p-6 lg:pb-6">
      <h1 className="mb-4 text-2xl font-semibold">Materiel disponible</h1>

      {/* Search + Filters */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher du materiel..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-md border border-input pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={categorieId || ''} onChange={(e) => { setCategorieId(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
            className="rounded-md border border-input px-3 py-1.5 text-sm">
            <option value="">Toutes categories</option>
            {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <select value={etat || ''} onChange={(e) => { setEtat(e.target.value || undefined); setPage(1); }}
            className="rounded-md border border-input px-3 py-1.5 text-sm">
            <option value="">Tous etats</option>
            <option value="bon">Bon</option><option value="usage">Usage</option>
            <option value="a_reparer">A reparer</option><option value="hors_service">Hors service</option>
          </select>
          <select value={typeItem || ''} onChange={(e) => { setTypeItem(e.target.value || undefined); setPage(1); }}
            className="rounded-md border border-input px-3 py-1.5 text-sm">
            <option value="">Tous types</option>
            <option value="equipement">Equipement</option><option value="consommable">Consommable</option>
          </select>
          <select value={localisationId || ''} onChange={(e) => { setLocalisationId(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
            className="rounded-md border border-input px-3 py-1.5 text-sm">
            <option value="">Toutes localisations</option>
            {localisations?.map((l: any) => <option key={l.id} value={l.id}>{l.nom}</option>)}
          </select>
        </div>
      </div>

      {data && <p className="mb-3 text-sm text-muted-foreground">{data.total} item{data.total > 1 ? 's' : ''} trouve{data.total > 1 ? 's' : ''}</p>}

      {isLoading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">Categorie</th>
                  <th className="px-4 py-3 font-medium text-center">Stock</th>
                  <th className="px-4 py-3 font-medium">Etat</th>
                  <th className="px-4 py-3 font-medium">Localisation</th>
                  <th className="px-4 py-3 font-medium">Perimetre</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((item: any) => {
                  const expanded = expandedId === item.id;
                  return (
                    <>{/* Fragment key on first tr */}
                      <tr key={item.id} onClick={() => toggleExpand(item.id)}
                        className="border-t border-border cursor-pointer hover:bg-muted/50">
                        <td className="px-2 py-3 text-muted-foreground">
                          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.nom}</div>
                          {item.marquage && <div className="text-xs text-muted-foreground">{item.marquage}</div>}
                          {item.typeItem === 'consommable' && (
                            <span className="mt-0.5 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-800">Consommable</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.categorie?.nom}
                          {item.sousCategorie && <span className="text-xs"> / {item.sousCategorie.nom}</span>}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">{item.quantiteStock}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ETAT_LABELS[item.etat]?.color}`}>
                            {ETAT_LABELS[item.etat]?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{item.localisation?.nom || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PERIMETRE_LABELS[item.perimetreUtilisation]?.color}`}>
                            {PERIMETRE_LABELS[item.perimetreUtilisation]?.label}
                          </span>
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`${item.id}-detail`} className="border-t border-border bg-muted/30">
                          <td colSpan={7} className="px-6 py-4">
                            <ItemDetail item={item} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {data?.items.map((item: any) => {
              const expanded = expandedId === item.id;
              return (
                <div key={item.id} className="rounded-lg border border-border">
                  <button onClick={() => toggleExpand(item.id)}
                    className="flex w-full items-start justify-between p-3 text-left">
                    <div>
                      <div className="font-medium">{item.nom}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.categorie?.nom}{item.sousCategorie ? ` / ${item.sousCategorie.nom}` : ''}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${ETAT_LABELS[item.etat]?.color}`}>
                          {ETAT_LABELS[item.etat]?.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${PERIMETRE_LABELS[item.perimetreUtilisation]?.color}`}>
                          <Tag className="h-3 w-3" />{PERIMETRE_LABELS[item.perimetreUtilisation]?.label}
                        </span>
                        {item.localisation && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />{item.localisation.nom}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-muted px-2 py-1 text-sm font-semibold">{item.quantiteStock}</span>
                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>
                  {expanded && (
                    <div className="border-t border-border p-3">
                      <ItemDetail item={item} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-50">
                <ChevronLeft className="h-4 w-4" /> Precedent
              </button>
              <span className="text-sm text-muted-foreground">Page {data.page} / {data.totalPages}</span>
              <button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}
                className="flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-50">
                Suivant <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
