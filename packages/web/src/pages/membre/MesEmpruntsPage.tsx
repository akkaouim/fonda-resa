import { useState, useMemo } from 'react';
import { useReservations, useCancelReservation, useDuplicateReservation } from '../../hooks/useReservations';
import { useNavigate } from 'react-router-dom';
import { Clock, Copy, X, ChevronDown, ChevronUp, Search, ArrowUpDown } from 'lucide-react';

const STATUT_STYLES: Record<string, { label: string; color: string; order: number }> = {
  en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', order: 0 },
  validee: { label: 'Validee', color: 'bg-green-100 text-green-800', order: 1 },
  sortie: { label: 'Sortie', color: 'bg-orange-100 text-orange-800', order: 2 },
  retournee: { label: 'Retournee', color: 'bg-blue-100 text-blue-800', order: 3 },
  refusee: { label: 'Refusee', color: 'bg-red-100 text-red-800', order: 4 },
  annulee: { label: 'Annulee', color: 'bg-gray-100 text-gray-600', order: 5 },
  terminee: { label: 'Terminee', color: 'bg-purple-100 text-purple-800', order: 6 },
};

type SortKey = 'date_desc' | 'date_asc' | 'motif' | 'statut' | 'items';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date_desc', label: 'Date (recent d\'abord)' },
  { value: 'date_asc', label: 'Date (ancien d\'abord)' },
  { value: 'motif', label: 'Titre (A-Z)' },
  { value: 'statut', label: 'Statut' },
  { value: 'items', label: 'Nombre d\'items' },
];

export default function MesEmpruntsPage() {
  const [statutFilter, setStatutFilter] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date_desc');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data, isLoading } = useReservations({ statut: statutFilter });
  const cancelResa = useCancelReservation();
  const duplicateResa = useDuplicateReservation();
  const navigate = useNavigate();

  const handleDuplicate = (id: number) => {
    duplicateResa.mutate(id, {
      onSuccess: (data) => {
        sessionStorage.setItem('reservationPrefill', JSON.stringify(data));
        navigate('/reserver');
      },
    });
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  const filteredAndSorted = useMemo(() => {
    if (!data?.items) return [];

    let items = data.items as any[];

    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      items = items.filter((r: any) =>
        r.motif.toLowerCase().includes(q) ||
        r.lieuEvenement.toLowerCase().includes(q) ||
        r.lignes.some((l: any) => l.item.nom.toLowerCase().includes(q))
      );
    }

    // Sort
    return [...items].sort((a: any, b: any) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime();
        case 'date_asc':
          return new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime();
        case 'motif':
          return a.motif.localeCompare(b.motif, 'fr');
        case 'statut':
          return (STATUT_STYLES[a.statut]?.order ?? 9) - (STATUT_STYLES[b.statut]?.order ?? 9);
        case 'items':
          return b.lignes.length - a.lignes.length;
        default:
          return 0;
      }
    });
  }, [data?.items, searchTerm, sortBy]);

  return (
    <div className="p-4 pb-20 lg:p-6 lg:pb-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Clock className="h-6 w-6" /> Mes emprunts
        </h1>
      </div>

      {/* Search + Filters + Sort */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par titre, lieu ou materiel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-input pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={statutFilter || ''}
            onChange={(e) => setStatutFilter(e.target.value || undefined)}
            className="rounded-md border border-input px-3 py-1.5 text-sm"
          >
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="validee">Validees</option>
            <option value="sortie">Sorties</option>
            <option value="retournee">Retournees</option>
            <option value="refusee">Refusees</option>
            <option value="annulee">Annulees</option>
          </select>
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-md border border-input px-3 py-1.5 text-sm"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      {data && (
        <p className="mb-3 text-sm text-muted-foreground">
          {filteredAndSorted.length} reservation{filteredAndSorted.length > 1 ? 's' : ''}
          {searchTerm && ` pour "${searchTerm}"`}
        </p>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : filteredAndSorted.length === 0 ? (
        <p className="text-muted-foreground">
          {searchTerm ? 'Aucun resultat pour cette recherche.' : 'Aucune reservation pour le moment.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filteredAndSorted.map((r: any) => {
            const s = STATUT_STYLES[r.statut] || STATUT_STYLES.en_attente;
            const expanded = expandedId === r.id;
            return (
              <div key={r.id} className="rounded-lg border border-border">
                <button
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                  className="flex w-full items-center justify-between p-3 text-left text-sm hover:bg-muted/50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>
                      <span className="font-medium">{r.motif}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDate(r.dateDebut)} → {formatDate(r.dateFin)} · {r.lignes.length} item{r.lignes.length > 1 ? 's' : ''} · {r.lieuEvenement}
                    </div>
                  </div>
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {expanded && (
                  <div className="border-t border-border p-3 space-y-2">
                    <ul className="space-y-1 text-sm">
                      {r.lignes.map((l: any) => (
                        <li key={l.id} className="text-muted-foreground">
                          {l.quantiteDemandee}x {l.item.nom}
                          {l.item.categorie && <span className="text-xs"> ({l.item.categorie.nom})</span>}
                        </li>
                      ))}
                    </ul>
                    {r.commentaireAdmin && (
                      <p className="text-sm"><span className="text-muted-foreground">Note admin :</span> {r.commentaireAdmin}</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleDuplicate(r.id)}
                        className="flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-xs hover:bg-muted">
                        <Copy className="h-3 w-3" /> Reutiliser
                      </button>
                      {['en_attente', 'validee'].includes(r.statut) && (
                        <button onClick={() => { if (confirm('Annuler cette reservation ?')) cancelResa.mutate(r.id); }}
                          className="flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-xs text-destructive hover:bg-red-50">
                          <X className="h-3 w-3" /> Annuler
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
