import { useState } from 'react';
import { useMouvements, useCreateSortie, useCreateRetour, useCreateConsommation } from '../../hooks/useMouvements';
import { useItems } from '../../hooks/useItems';
import { useReservations } from '../../hooks/useReservations';
import { ArrowDownCircle, ArrowUpCircle, Flame, Plus, Trash2, AlertTriangle, MousePointerClick } from 'lucide-react';

const ETAT_OPTIONS = [
  { value: '', label: '-- Etat --' },
  { value: 'bon', label: 'Bon' },
  { value: 'usage', label: 'Usage' },
  { value: 'a_reparer', label: 'A reparer' },
  { value: 'hors_service', label: 'Hors service' },
];

const TYPE_STYLES: Record<string, { label: string; color: string }> = {
  sortie: { label: 'Sortie', color: 'bg-orange-100 text-orange-800' },
  retour: { label: 'Retour', color: 'bg-green-100 text-green-800' },
  consommation: { label: 'Consommation', color: 'bg-blue-100 text-blue-800' },
};

type TabKey = 'sortie' | 'retour' | 'consommable';

interface LigneForm {
  itemId: number;
  quantite: number;
  etatConstate: string;
  commentaire: string;
  quantiteAReparer: number;
  quantiteHorsService: number;
}

const emptyLigne = (): LigneForm => ({ itemId: 0, quantite: 1, etatConstate: '', commentaire: '', quantiteAReparer: 0, quantiteHorsService: 0 });

export default function MouvementsPage() {
  const [tab, setTab] = useState<TabKey>('sortie');
  const [filterType, setFilterType] = useState<string>('');

  // Sortie / Retour form state
  const [reservationId, setReservationId] = useState<number | undefined>();
  const [lignes, setLignes] = useState<LigneForm[]>([emptyLigne()]);

  // Retour tab: filter the "materiel sorti" table by reservation
  const [retourFilterResaId, setRetourFilterResaId] = useState<number | undefined>();

  // Consommable form state
  const [consoItemId, setConsoItemId] = useState<number>(0);
  const [consoQuantite, setConsoQuantite] = useState<number>(1);
  const [consoCommentaire, setConsoCommentaire] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data hooks
  const { data: mouvementsData, isLoading: mouvLoading } = useMouvements({ typeMouvement: filterType || undefined, limit: 50 });
  // All mouvements (unfiltered) for retour tab to compute net balances
  const { data: allMouvementsData } = useMouvements({ limit: 500 });
  const { data: itemsData } = useItems({ limit: 500 });
  const { data: resaValidees } = useReservations({ statut: 'validee' });
  const { data: resaSorties } = useReservations({ statut: 'sortie' });

  const createSortie = useCreateSortie();
  const createRetour = useCreateRetour();
  const createConsommation = useCreateConsommation();

  const allItems = itemsData?.items || [];
  const consommableItems = allItems.filter((i: any) => i.typeItem === 'consommable');

  // For sortie tab: reservations with statut "validee" (not yet checked out)
  const reservationsForSortie = resaValidees?.items || [];
  // For retour tab: reservations with statut "sortie" (checked out, awaiting return)
  const reservationsForRetour = resaSorties?.items || [];

  // Auto-fill lines when a reservation is selected
  const handleReservationChange = (id: number | undefined) => {
    setReservationId(id);
    if (id) {
      const allResas = [...reservationsForSortie, ...reservationsForRetour];
      const resa = allResas.find((r: any) => r.id === id);
      if (resa && resa.lignes?.length > 0) {
        setLignes(resa.lignes.map((l: any) => ({
          itemId: l.itemId,
          quantite: l.quantiteDemandee,
          etatConstate: '',
          commentaire: '',
        })));
        return;
      }
    }
    setLignes([emptyLigne()]);
  };

  const updateLigne = (index: number, field: keyof LigneForm, value: string | number) => {
    setLignes((prev) => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };

  const addLigne = () => setLignes((prev) => [...prev, emptyLigne()]);

  const removeLigne = (index: number) => {
    setLignes((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  const resetForm = () => {
    setReservationId(undefined);
    setLignes([emptyLigne()]);
    setConsoItemId(0);
    setConsoQuantite(1);
    setConsoCommentaire('');
    setError(null);
  };

  // Add an item to the retour form (appends or fills first empty line)
  const addRetourLigne = (entry: { item: any; qteOut: number; reservation: any }) => {
    setLignes((prev) => {
      // If the item is already in the form, skip
      if (prev.some((l) => l.itemId === entry.item.id)) return prev;
      const newLigne: LigneForm = {
        itemId: entry.item.id,
        quantite: entry.qteOut,
        etatConstate: '',
        commentaire: '',
        quantiteAReparer: 0,
        quantiteHorsService: 0,
      };
      // Fill first empty line, or append
      const emptyIdx = prev.findIndex((l) => l.itemId === 0);
      if (emptyIdx >= 0) {
        return prev.map((l, i) => i === emptyIdx ? newLigne : l);
      }
      return [...prev, newLigne];
    });
    if (entry.reservation?.id) {
      setReservationId(entry.reservation.id);
    }
    setSuccess(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pre-fill retour form with multiple items (bulk)
  const prefillRetourBulk = (itemsOut: { item: any; qteOut: number; reservation: any }[]) => {
    const newLignes: LigneForm[] = itemsOut.map((e) => ({
      itemId: e.item.id,
      quantite: e.qteOut,
      etatConstate: '',
      commentaire: '',
      quantiteAReparer: 0,
      quantiteHorsService: 0,
    }));
    setLignes((prev) => {
      // Keep existing non-empty lines that are not in the new set
      const newItemIds = new Set(newLignes.map((l) => l.itemId));
      const kept = prev.filter((l) => l.itemId > 0 && !newItemIds.has(l.itemId));
      return [...kept, ...newLignes];
    });
    // If all items share the same reservation, set it
    const resaIds = new Set(itemsOut.filter((e) => e.reservation?.id).map((e) => e.reservation.id));
    if (resaIds.size === 1) {
      setReservationId(resaIds.values().next().value);
    }
    setSuccess(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Compute items currently out (used by retour tab) — uses ALL mouvements, not filtered
  const getItemsOut = () => {
    const allMouvs = allMouvementsData?.items || [];
    const outMap = new Map<string, { item: any; qteOut: number; dateSortie: string; reservation: any; utilisateur: any }>();
    for (const m of allMouvs) {
      // Key by itemId + reservationId to track per-reservation
      const key = `${m.itemId}-${m.reservationId || 'none'}`;
      if (m.typeMouvement === 'sortie') {
        const existing = outMap.get(key);
        if (existing) {
          existing.qteOut += m.quantite;
        } else {
          outMap.set(key, {
            item: m.item,
            qteOut: m.quantite,
            dateSortie: m.createdAt,
            reservation: m.reservation,
            utilisateur: m.utilisateur,
          });
        }
      } else if (m.typeMouvement === 'retour') {
        const existing = outMap.get(key);
        if (existing) {
          existing.qteOut -= m.quantite;
        }
      }
    }
    return Array.from(outMap.values()).filter((e) => e.qteOut > 0 && e.item?.typeItem !== 'consommable');
  };

  // Get items out, adjusted for what's already in the form
  const getVisibleItemsOut = () => {
    const itemsOut = getItemsOut();
    // Reduce displayed quantities by what's already in the form
    return itemsOut
      .map((e) => {
        const inForm = lignes.find((l) => l.itemId === e.item?.id);
        if (!inForm) return e;
        const remaining = e.qteOut - inForm.quantite;
        return { ...e, qteOut: remaining };
      })
      .filter((e) => e.qteOut > 0);
  };

  const handleSubmitSortie = () => {
    setError(null);
    setSuccess(null);
    const validLignes = lignes.filter((l) => l.itemId > 0);
    if (validLignes.length === 0) { setError('Ajoutez au moins un item.'); return; }

    const payload = {
      reservationId,
      lignes: validLignes.map((l) => ({
        itemId: l.itemId,
        quantite: l.quantite,
        ...(l.etatConstate ? { etatConstate: l.etatConstate } : {}),
        ...(l.commentaire ? { commentaire: l.commentaire } : {}),
      })),
    };

    createSortie.mutate(payload, {
      onSuccess: () => { setSuccess('Sortie enregistree.'); resetForm(); },
      onError: (err) => setError((err as any)?.response?.data?.error?.message || 'Erreur'),
    });
  };

  const handleSubmitRetour = () => {
    setError(null);
    setSuccess(null);
    const validLignes = lignes.filter((l) => l.itemId > 0);
    if (validLignes.length === 0) { setError('Ajoutez au moins un item.'); return; }

    // Validate: etat is required for all lines
    const missingEtat = validLignes.find((l) => !l.etatConstate);
    if (missingEtat) {
      setError('L\'etat est obligatoire pour chaque item retourne.');
      return;
    }

    const payload = {
      reservationId,
      lignes: validLignes.map((l) => ({
        itemId: l.itemId,
        quantite: l.quantite,
        etatConstate: l.etatConstate,
        ...(l.commentaire ? { commentaire: l.commentaire } : {}),
        quantiteAReparer: l.quantiteAReparer || 0,
        quantiteHorsService: l.quantiteHorsService || 0,
      })),
    };

    createRetour.mutate(payload, {
      onSuccess: () => { setSuccess('Retour enregistre.'); resetForm(); },
      onError: (err) => setError((err as any)?.response?.data?.error?.message || 'Erreur'),
    });
  };

  const handleSubmitConsommation = () => {
    setError(null);
    setSuccess(null);
    if (!consoItemId) { setError('Selectionnez un consommable.'); return; }

    createConsommation.mutate(
      { itemId: consoItemId, quantite: consoQuantite, ...(consoCommentaire ? { commentaire: consoCommentaire } : {}) },
      {
        onSuccess: () => { setSuccess('Consommation enregistree.'); resetForm(); },
        onError: (err) => setError((err as any)?.response?.data?.error?.message || 'Erreur'),
      },
    );
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const isPending = createSortie.isPending || createRetour.isPending || createConsommation.isPending;

  return (
    <div className="p-4 pb-20 lg:p-6 lg:pb-6">
      <h1 className="mb-4 text-2xl font-semibold">Entrees / Sorties</h1>

      {/* Tab toggle */}
      <div className="mb-4 flex gap-1 rounded-lg border border-border p-1">
        {([
          { key: 'sortie' as TabKey, label: 'Sortie', icon: ArrowUpCircle },
          { key: 'retour' as TabKey, label: 'Retour', icon: ArrowDownCircle },
          { key: 'consommable' as TabKey, label: 'Consommable', icon: Flame },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setError(null); setSuccess(null); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {success}
        </div>
      )}

      {/* ─── Sortie / Retour form ─── */}
      {(tab === 'sortie' || tab === 'retour') && (
        <div className="mb-6 rounded-lg border border-border p-4 space-y-4">
          <h2 className="text-lg font-medium">
            {tab === 'sortie' ? 'Enregistrer une sortie' : 'Enregistrer un retour'}
          </h2>

          {/* Reservation selector (sortie only — retour uses the table filter below) */}
          {tab === 'sortie' && (
            <div>
              <label className="mb-1 block text-sm font-medium">Reservation (optionnel)</label>
              <select
                value={reservationId || ''}
                onChange={(e) => handleReservationChange(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
              >
                <option value="">-- Sans reservation --</option>
                {reservationsForSortie.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    #{r.id} — {r.motif} ({r.utilisateur?.prenom} {r.utilisateur?.nom})
                  </option>
                ))}
              </select>
              {reservationsForSortie.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">Aucune reservation validee en attente de sortie.</p>
              )}
            </div>
          )}

          {/* Lines */}
          <div className="space-y-3">
            <label className="block text-sm font-medium">Items</label>
            {lignes.map((ligne, idx) => {
              // For retour tab, compute items currently out to filter the dropdown
              const itemsCurrentlyOut = (() => {
                if (tab !== 'retour') return null;
                const allMouvs = allMouvementsData?.items || [];
                const outMap = new Map<number, number>();
                for (const m of allMouvs) {
                  if (m.typeMouvement === 'sortie') outMap.set(m.itemId, (outMap.get(m.itemId) || 0) + m.quantite);
                  else if (m.typeMouvement === 'retour') outMap.set(m.itemId, (outMap.get(m.itemId) || 0) - m.quantite);
                }
                return new Set(Array.from(outMap.entries()).filter(([, qty]) => qty > 0).map(([id]) => id));
              })();
              const filteredItems = itemsCurrentlyOut ? allItems.filter((i: any) => itemsCurrentlyOut.has(i.id)) : allItems;

              const showDegradedQty = tab === 'retour'
                && ['a_reparer', 'hors_service'].includes(ligne.etatConstate)
                && ligne.quantite > 1;

              return (
              <div key={idx} className="rounded-md border border-border p-3 space-y-2">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="flex-1 min-w-[180px]">
                    <select
                      value={ligne.itemId || ''}
                      onChange={(e) => updateLigne(idx, 'itemId', Number(e.target.value))}
                      className="w-full rounded-md border border-input px-3 py-2 text-sm"
                    >
                      <option value="">-- Item --</option>
                      {filteredItems.map((item: any) => (
                        <option key={item.id} value={item.id}>
                          {item.nom} {tab === 'retour' ? '' : `(stock: ${item.quantiteStock})`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min={1}
                      value={ligne.quantite}
                      onChange={(e) => updateLigne(idx, 'quantite', Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-md border border-input px-3 py-2 text-sm"
                      placeholder="Qte"
                    />
                  </div>
                  <div className="w-32">
                    <select
                      value={ligne.etatConstate}
                      onChange={(e) => {
                        updateLigne(idx, 'etatConstate', e.target.value);
                        // Reset degraded quantities when switching to bon/usage
                        if (['bon', 'usage', ''].includes(e.target.value)) {
                          updateLigne(idx, 'quantiteAReparer', 0);
                          updateLigne(idx, 'quantiteHorsService', 0);
                        }
                      }}
                      className={`w-full rounded-md border px-3 py-2 text-sm ${
                        tab === 'retour' && !ligne.etatConstate && ligne.itemId > 0
                          ? 'border-red-300 bg-red-50'
                          : 'border-input'
                      }`}
                    >
                      {(tab === 'retour'
                        ? ETAT_OPTIONS.filter((o) => o.value !== '').concat([]).length > 0
                          ? [{ value: '', label: '-- Etat * --' }, ...ETAT_OPTIONS.filter((o) => o.value !== '')]
                          : ETAT_OPTIONS
                        : ETAT_OPTIONS
                      ).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <input
                      type="text"
                      value={ligne.commentaire}
                      onChange={(e) => updateLigne(idx, 'commentaire', e.target.value)}
                      placeholder="Commentaire..."
                      className="w-full rounded-md border border-input px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => removeLigne(idx)}
                    className="mt-1 text-destructive hover:text-destructive/80"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {/* Degraded quantity fields (retour only, when etat is bad and qty > 1) */}
                {showDegradedQty && (
                  <div className="ml-0 flex flex-wrap items-center gap-3 rounded-md bg-orange-50 px-3 py-2 text-sm">
                    <span className="text-orange-800">Sur {ligne.quantite} retourne(s), combien sont :</span>
                    {ligne.etatConstate === 'a_reparer' && (
                      <label className="flex items-center gap-1.5">
                        <span className="text-orange-700">A reparer :</span>
                        <input type="number" min={0} max={ligne.quantite}
                          value={ligne.quantiteAReparer}
                          onChange={(e) => updateLigne(idx, 'quantiteAReparer', Math.min(ligne.quantite, Math.max(0, Number(e.target.value))))}
                          className="w-16 rounded-md border border-orange-300 px-2 py-1 text-sm" />
                      </label>
                    )}
                    {ligne.etatConstate === 'hors_service' && (
                      <label className="flex items-center gap-1.5">
                        <span className="text-red-700">Hors service :</span>
                        <input type="number" min={0} max={ligne.quantite}
                          value={ligne.quantiteHorsService}
                          onChange={(e) => updateLigne(idx, 'quantiteHorsService', Math.min(ligne.quantite, Math.max(0, Number(e.target.value))))}
                          className="w-16 rounded-md border border-red-300 px-2 py-1 text-sm" />
                      </label>
                    )}
                  </div>
                )}
              </div>
              );
            })}
            <button
              onClick={addLigne}
              className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
            >
              <Plus className="h-4 w-4" /> Ajouter un item
            </button>
          </div>

          <button
            onClick={tab === 'sortie' ? handleSubmitSortie : handleSubmitRetour}
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? 'Enregistrement...' : tab === 'sortie' ? 'Enregistrer la sortie' : 'Enregistrer le retour'}
          </button>
        </div>
      )}

      {/* ─── Consommable form ─── */}
      {tab === 'consommable' && (
        <div className="mb-6 rounded-lg border border-border p-4 space-y-4">
          <h2 className="text-lg font-medium">Declarer une consommation</h2>

          <div>
            <label className="mb-1 block text-sm font-medium">Consommable</label>
            <select
              value={consoItemId || ''}
              onChange={(e) => setConsoItemId(Number(e.target.value))}
              className="w-full rounded-md border border-input px-3 py-2 text-sm"
            >
              <option value="">-- Choisir un consommable --</option>
              {consommableItems.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.nom} (stock: {item.quantiteStock})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-4">
            <div className="w-32">
              <label className="mb-1 block text-sm font-medium">Quantite</label>
              <input
                type="number"
                min={1}
                value={consoQuantite}
                onChange={(e) => setConsoQuantite(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Commentaire (optionnel)</label>
              <input
                type="text"
                value={consoCommentaire}
                onChange={(e) => setConsoCommentaire(e.target.value)}
                placeholder="Commentaire..."
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleSubmitConsommation}
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? 'Enregistrement...' : 'Declarer la consommation'}
          </button>
        </div>
      )}

      {/* ─── Tab-specific lists ─── */}

      {/* Sortie tab: full movement history */}
      {tab === 'sortie' && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">Historique des mouvements</h2>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-md border border-input px-3 py-1.5 text-sm"
            >
              <option value="">Tous les types</option>
              <option value="sortie">Sorties</option>
              <option value="retour">Retours</option>
              <option value="consommation">Consommations</option>
            </select>
          </div>

          {mouvLoading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : !mouvementsData?.items?.length ? (
            <p className="text-muted-foreground">Aucun mouvement enregistre.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium text-center">Qte</th>
                    <th className="px-3 py-2 font-medium">Etat</th>
                    <th className="px-3 py-2 font-medium">Reservation</th>
                    <th className="px-3 py-2 font-medium">Par</th>
                    <th className="px-3 py-2 font-medium">Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {mouvementsData.items.map((m: any) => {
                    const ts = TYPE_STYLES[m.typeMouvement] || TYPE_STYLES.sortie;
                    return (
                      <tr key={m.id} className="border-t border-border hover:bg-muted/50">
                        <td className="px-3 py-2 whitespace-nowrap">{formatDate(m.createdAt)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ts.color}`}>
                            {ts.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium">{m.item?.nom || `#${m.itemId}`}</td>
                        <td className="px-3 py-2 text-center font-medium">{m.quantite}</td>
                        <td className="px-3 py-2 text-xs">{m.etatConstate || '—'}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {m.reservation ? `#${m.reservation.id} ${m.reservation.motif}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {m.utilisateur ? `${m.utilisateur.prenom} ${m.utilisateur.nom}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{m.commentaire || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Retour tab: items currently out, awaiting return */}
      {tab === 'retour' && (() => {
        const visibleItems = getVisibleItemsOut();
        // Filter by reservation if selected
        const filteredItems = retourFilterResaId
          ? visibleItems.filter((e) => e.reservation?.id === retourFilterResaId)
          : visibleItems;

        // Get unique reservations from all items out (for the filter dropdown)
        const allItemsOut = getItemsOut();
        const uniqueResas = Array.from(
          new Map(
            allItemsOut
              .filter((e) => e.reservation?.id)
              .map((e) => [e.reservation.id, e.reservation])
          ).values()
        );

        return (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-medium">Materiel en attente de retour</h2>
              <div className="flex items-center gap-2">
                <select
                  value={retourFilterResaId || ''}
                  onChange={(e) => setRetourFilterResaId(e.target.value ? Number(e.target.value) : undefined)}
                  className="rounded-md border border-input px-3 py-1.5 text-sm"
                >
                  <option value="">Toutes les reservations</option>
                  {uniqueResas.map((r: any) => (
                    <option key={r.id} value={r.id}>#{r.id} — {r.motif}</option>
                  ))}
                </select>
                {filteredItems.length > 0 && (
                  <button
                    onClick={() => prefillRetourBulk(filteredItems)}
                    className="flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    <MousePointerClick className="h-4 w-4" /> Tout pre-remplir
                  </button>
                )}
              </div>
            </div>
            {mouvLoading ? (
              <p className="text-muted-foreground">Chargement...</p>
            ) : filteredItems.length === 0 ? (
              <p className="text-muted-foreground">
                {visibleItems.length === 0 && lignes.some((l) => l.itemId > 0)
                  ? 'Tous les items en attente ont ete ajoutes au formulaire ci-dessus.'
                  : 'Aucun materiel en attente de retour.'}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 font-medium text-center">Qte en attente</th>
                      <th className="px-3 py-2 font-medium">Date de sortie</th>
                      <th className="px-3 py-2 font-medium">Retour prevu</th>
                      <th className="px-3 py-2 font-medium">Reservation</th>
                      <th className="px-3 py-2 font-medium">Emprunteur</th>
                      <th className="w-10 px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((e) => {
                      const retourPrevu = e.reservation?.dateFin;
                      const enRetard = retourPrevu && new Date(retourPrevu) < new Date();
                      return (
                        <tr key={`${e.item?.id}-${e.reservation?.id || 'none'}`}
                          onDoubleClick={() => addRetourLigne(e)}
                          className={`border-t border-border ${enRetard ? 'bg-red-50' : 'hover:bg-muted/50'}`}
                        >
                          <td className="px-3 py-2 font-medium">{e.item?.nom || '—'}</td>
                          <td className="px-3 py-2 text-center font-medium">{e.qteOut}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatDate(e.dateSortie)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {retourPrevu ? (
                              <span className={`flex items-center gap-1 ${enRetard ? 'font-medium text-destructive' : ''}`}>
                                {enRetard && <AlertTriangle className="h-3.5 w-3.5" />}
                                {formatDate(retourPrevu)}
                                {enRetard && <span className="text-xs">(en retard)</span>}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {e.reservation ? `#${e.reservation.id} ${e.reservation.motif}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {e.utilisateur ? `${e.utilisateur.prenom} ${e.utilisateur.nom}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => addRetourLigne(e)}
                              className="rounded border border-input p-1 text-primary hover:bg-primary/10"
                              title="Ajouter au formulaire de retour"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* Consommable tab: consommation history only */}
      {tab === 'consommable' && (() => {
        const consoMouvs = (mouvementsData?.items || []).filter((m: any) => m.typeMouvement === 'consommation');
        return (
          <div>
            <h2 className="mb-3 text-lg font-medium">Historique des consommations</h2>
            {mouvLoading ? (
              <p className="text-muted-foreground">Chargement...</p>
            ) : consoMouvs.length === 0 ? (
              <p className="text-muted-foreground">Aucune consommation enregistree.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Consommable</th>
                      <th className="px-3 py-2 font-medium text-center">Qte</th>
                      <th className="px-3 py-2 font-medium">Stock restant</th>
                      <th className="px-3 py-2 font-medium">Par</th>
                      <th className="px-3 py-2 font-medium">Commentaire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consoMouvs.map((m: any) => (
                      <tr key={m.id} className="border-t border-border hover:bg-muted/50">
                        <td className="px-3 py-2 whitespace-nowrap">{formatDate(m.createdAt)}</td>
                        <td className="px-3 py-2 font-medium">{m.item?.nom || `#${m.itemId}`}</td>
                        <td className="px-3 py-2 text-center font-medium">{m.quantite}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{m.item?.quantiteStock ?? '—'}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {m.utilisateur ? `${m.utilisateur.prenom} ${m.utilisateur.nom}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{m.commentaire || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
