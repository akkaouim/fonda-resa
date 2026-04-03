import { useState } from 'react';
import { useMouvements, useCreateSortie, useCreateRetour, useCreateConsommation } from '../../hooks/useMouvements';
import { useItems } from '../../hooks/useItems';
import { useReservations } from '../../hooks/useReservations';
import { ArrowDownCircle, ArrowUpCircle, Flame, Plus, Trash2 } from 'lucide-react';

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
}

const emptyLigne = (): LigneForm => ({ itemId: 0, quantite: 1, etatConstate: '', commentaire: '' });

export default function MouvementsPage() {
  const [tab, setTab] = useState<TabKey>('sortie');
  const [filterType, setFilterType] = useState<string>('');

  // Sortie / Retour form state
  const [reservationId, setReservationId] = useState<number | undefined>();
  const [lignes, setLignes] = useState<LigneForm[]>([emptyLigne()]);

  // Consommable form state
  const [consoItemId, setConsoItemId] = useState<number>(0);
  const [consoQuantite, setConsoQuantite] = useState<number>(1);
  const [consoCommentaire, setConsoCommentaire] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data hooks
  const { data: mouvementsData, isLoading: mouvLoading } = useMouvements({ typeMouvement: filterType || undefined, limit: 50 });
  const { data: itemsData } = useItems({ limit: 500 });
  const { data: reservationsData } = useReservations({ statut: 'validee' });

  const createSortie = useCreateSortie();
  const createRetour = useCreateRetour();
  const createConsommation = useCreateConsommation();

  const allItems = itemsData?.items || [];
  const consommableItems = allItems.filter((i: any) => i.typeItem === 'consommable');
  const validatedReservations = reservationsData?.items || [];

  // Auto-fill lines when a reservation is selected
  const handleReservationChange = (id: number | undefined) => {
    setReservationId(id);
    if (id) {
      const resa = validatedReservations.find((r: any) => r.id === id);
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

    const payload = {
      reservationId,
      lignes: validLignes.map((l) => ({
        itemId: l.itemId,
        quantite: l.quantite,
        ...(l.etatConstate ? { etatConstate: l.etatConstate } : {}),
        ...(l.commentaire ? { commentaire: l.commentaire } : {}),
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

          {/* Reservation selector */}
          <div>
            <label className="mb-1 block text-sm font-medium">Reservation (optionnel)</label>
            <select
              value={reservationId || ''}
              onChange={(e) => handleReservationChange(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full rounded-md border border-input px-3 py-2 text-sm"
            >
              <option value="">-- Sans reservation --</option>
              {validatedReservations.map((r: any) => (
                <option key={r.id} value={r.id}>
                  #{r.id} — {r.motif} ({r.utilisateur?.prenom} {r.utilisateur?.nom})
                </option>
              ))}
            </select>
          </div>

          {/* Lines */}
          <div className="space-y-3">
            <label className="block text-sm font-medium">Items</label>
            {lignes.map((ligne, idx) => (
              <div key={idx} className="flex flex-wrap items-start gap-2 rounded-md border border-border p-3">
                <div className="flex-1 min-w-[180px]">
                  <select
                    value={ligne.itemId || ''}
                    onChange={(e) => updateLigne(idx, 'itemId', Number(e.target.value))}
                    className="w-full rounded-md border border-input px-3 py-2 text-sm"
                  >
                    <option value="">-- Item --</option>
                    {allItems.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.nom} (stock: {item.quantiteStock})
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
                    onChange={(e) => updateLigne(idx, 'etatConstate', e.target.value)}
                    className="w-full rounded-md border border-input px-3 py-2 text-sm"
                  >
                    {ETAT_OPTIONS.map((o) => (
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
            ))}
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

      {/* ─── Movement history ─── */}
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
    </div>
  );
}
