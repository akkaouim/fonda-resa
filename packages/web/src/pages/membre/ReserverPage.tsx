import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useItems, useLocalisations } from '../../hooks/useItems';
import { useCreateReservation } from '../../hooks/useReservations';
import { CalendarPlus, ArrowRight, ArrowLeft, Search, Plus, Minus, AlertTriangle, Check, X, Copy, Info, ChevronRight } from 'lucide-react';
import ItemDetail from '../../components/materiel/ItemDetail';

interface CartItem {
  itemId: number;
  nom: string;
  quantiteDemandee: number;
  quantiteStock: number;
  perimetre: string;
  localisation?: string;
  categorie?: string;
}

const PERIMETRE_WARN: Record<string, string> = {
  sur_le_site: 'Cet equipement ne peut pas quitter le site de l\'Esviere',
  sur_place: 'Cet equipement ne peut pas quitter sa salle',
};

export default function ReserverPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1: Event details
  const [motif, setMotif] = useState('');
  const [lieuEvenement, setLieuEvenement] = useState('');
  const [estHorsSite, setEstHorsSite] = useState(false);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  // Step 2: Item selection
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  // Prefill from duplicated reservation
  const [prefillInfo, setPrefillInfo] = useState<{ motif: string; itemCount: number; totalUnites: number; removedItems: string[] } | null>(null);

  const { data: localisations } = useLocalisations();
  const { data: itemsData } = useItems({ search: searchTerm || undefined, limit: 100 });
  const createReservation = useCreateReservation();

  // Load prefill data from sessionStorage (set by "Reutiliser" button)
  useEffect(() => {
    const raw = sessionStorage.getItem('reservationPrefill');
    if (!raw) return;
    sessionStorage.removeItem('reservationPrefill');
    try {
      const prefill = JSON.parse(raw);
      setMotif(prefill.motif || '');
      setLieuEvenement(prefill.lieuEvenement || '');
      setEstHorsSite(prefill.estHorsSite || false);
      const lignes = prefill.lignes || [];
      setPrefillInfo({
        motif: prefill.motif || '',
        itemCount: lignes.length,
        totalUnites: lignes.reduce((sum: number, l: any) => sum + (l.quantiteDemandee || 0), 0),
        removedItems: prefill.removedItems || [],
      });
      // Cart will be populated once itemsData is available
      if (prefill.lignes?.length > 0) {
        // Store lignes temporarily, will resolve item names when data loads
        sessionStorage.setItem('_prefillLignes', JSON.stringify(prefill.lignes));
      }
    } catch { /* ignore parse errors */ }
  }, []);

  // Resolve prefill lignes to cart items once item data is loaded
  useEffect(() => {
    const raw = sessionStorage.getItem('_prefillLignes');
    if (!raw || !itemsData?.items?.length) return;
    sessionStorage.removeItem('_prefillLignes');
    try {
      const lignes = JSON.parse(raw) as { itemId: number; quantiteDemandee: number }[];
      const cartItems: CartItem[] = [];
      for (const l of lignes) {
        const item = itemsData.items.find((i: any) => i.id === l.itemId);
        if (item) {
          cartItems.push({
            itemId: item.id,
            nom: item.nom,
            quantiteDemandee: l.quantiteDemandee,
            quantiteStock: item.quantiteStock,
            perimetre: item.perimetreUtilisation,
            localisation: item.localisation?.nom,
            categorie: item.categorie?.nom,
          });
        }
      }
      if (cartItems.length > 0) setCart(cartItems);
    } catch { /* ignore */ }
  }, [itemsData]);

  const addToCart = (item: any) => {
    if (cart.find((c) => c.itemId === item.id)) return;
    setCart([...cart, {
      itemId: item.id,
      nom: item.nom,
      quantiteDemandee: 1,
      quantiteStock: item.quantiteStock,
      perimetre: item.perimetreUtilisation,
      localisation: item.localisation?.nom,
      categorie: item.categorie?.nom,
    }]);
  };

  const updateQty = (itemId: number, delta: number) => {
    setCart(cart.map((c) => {
      if (c.itemId !== itemId) return c;
      const newQty = Math.max(1, Math.min(c.quantiteStock, c.quantiteDemandee + delta));
      return { ...c, quantiteDemandee: newQty };
    }));
  };

  const removeFromCart = (itemId: number) => {
    setCart(cart.filter((c) => c.itemId !== itemId));
  };

  const getPerimeterWarning = (item: CartItem): string | null => {
    if (item.perimetre === 'libre') return null;
    if (item.perimetre === 'sur_le_site' && estHorsSite) return PERIMETRE_WARN.sur_le_site;
    if (item.perimetre === 'sur_place' && item.localisation !== lieuEvenement) {
      return `Cet equipement ne peut pas quitter ${item.localisation}`;
    }
    return null;
  };

  const hasPerimeterErrors = cart.some((c) => getPerimeterWarning(c) !== null);

  const handleSubmit = () => {
    createReservation.mutate({
      dateDebut: new Date(dateDebut).toISOString(),
      dateFin: new Date(dateFin).toISOString(),
      motif,
      lieuEvenement,
      estHorsSite,
      lignes: cart.map((c) => ({ itemId: c.itemId, quantiteDemandee: c.quantiteDemandee })),
    }, {
      onSuccess: () => navigate('/mes-emprunts'),
    });
  };

  return (
    <div className="p-4 pb-20 lg:p-6 lg:pb-6">
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        <CalendarPlus className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Nouvelle reservation</h1>
        <span className="ml-auto text-sm text-muted-foreground">Etape {step}/3</span>
      </div>
      <div className="mb-6 flex gap-1">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>

      {/* Step 1: Event */}
      {step === 1 && (
        <div className="max-w-lg space-y-4">
          {/* Prefill notification */}
          {prefillInfo && (
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Copy className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">
                  Reservation basee sur "{prefillInfo.motif}"
                </p>
                <p className="mt-0.5 text-blue-700">
                  {prefillInfo.itemCount} item{prefillInfo.itemCount > 1 ? 's' : ''} ({prefillInfo.totalUnites} unite{prefillInfo.totalUnites > 1 ? 's' : ''}) pre-charge{prefillInfo.itemCount > 1 ? 's' : ''} dans l'etape 2. Ajustez les dates ci-dessous puis passez a l'etape suivante.
                </p>
                {prefillInfo.removedItems.length > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-orange-700">
                    <Info className="h-4 w-4" />
                    Item(s) supprime(s) depuis la reservation d'origine : {prefillInfo.removedItems.join(', ')}
                  </p>
                )}
              </div>
              <button onClick={() => setPrefillInfo(null)} className="shrink-0 text-blue-400 hover:text-blue-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Motif / Evenement *</label>
            <input required value={motif} onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex: Weekend de formation Pentecote"
              className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Lieu de l'evenement *</label>
            <select value={lieuEvenement} onChange={(e) => {
              setLieuEvenement(e.target.value);
              setEstHorsSite(e.target.value === '__hors_site__');
            }}
              className="w-full rounded-md border border-input px-3 py-2 text-sm">
              <option value="">Choisir un lieu...</option>
              {localisations?.map((l: any) => (
                <option key={l.id} value={l.nom}>{l.nom}</option>
              ))}
              <option value="__hors_site__">Hors site (en dehors de l'Esviere)</option>
            </select>
            {estHorsSite && (
              <input value={lieuEvenement === '__hors_site__' ? '' : lieuEvenement}
                onChange={(e) => setLieuEvenement(e.target.value)}
                placeholder="Preciser le lieu..."
                className="mt-2 w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Date de debut *</label>
              <input type="date" required value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
                className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Date de fin *</label>
              <input type="date" required value={dateFin} onChange={(e) => setDateFin(e.target.value)}
                min={dateDebut}
                className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!motif || !lieuEvenement || !dateDebut || !dateFin}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Suivant <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 2: Items */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            <strong>{motif}</strong> — {lieuEvenement} — {dateDebut} au {dateFin}
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-sm font-medium">Materiel selectionne ({cart.length})</p>
              {cart.map((c) => {
                const warning = getPerimeterWarning(c);
                return (
                  <div key={c.itemId} className={`flex items-center gap-2 rounded-md p-2 text-sm ${warning ? 'bg-red-50' : 'bg-muted/50'}`}>
                    <div className="flex-1">
                      <span className="font-medium">{c.nom}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{c.categorie}</span>
                      {warning && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="h-3 w-3" /> {warning}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(c.itemId, -1)} className="rounded border border-input p-1 hover:bg-muted">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center font-medium">{c.quantiteDemandee}</span>
                      <button onClick={() => updateQty(c.itemId, 1)} className="rounded border border-input p-1 hover:bg-muted">
                        <Plus className="h-3 w-3" />
                      </button>
                      <span className="ml-1 text-xs text-muted-foreground">/{c.quantiteStock}</span>
                    </div>
                    <button onClick={() => removeFromCart(c.itemId)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search items */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Rechercher du materiel..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-input pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
            {itemsData?.items.map((item: any) => {
              const inCart = cart.find((c) => c.itemId === item.id);
              const expanded = expandedItemId === item.id;
              return (
                <div key={item.id} className="border-b border-border last:border-0">
                  <div className="flex items-center justify-between px-3 py-2 text-sm">
                    <button
                      type="button"
                      onClick={() => setExpandedItemId(expanded ? null : item.id)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
                      <span className={inCart ? 'font-medium text-primary' : ''}>{item.nom}</span>
                      <span className="text-xs text-muted-foreground">{item.categorie?.nom}</span>
                      {item.perimetreUtilisation !== 'libre' && (
                        <span className={`inline-block rounded px-1 py-0.5 text-xs ${
                          item.perimetreUtilisation === 'sur_le_site' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {item.perimetreUtilisation === 'sur_le_site' ? 'Sur le site' : 'Sur place'}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{item.quantiteStock} dispo</span>
                      {inCart ? (
                        <span className="text-xs text-primary">Ajoute</span>
                      ) : (
                        <button type="button" onClick={() => addToCart(item)}
                          className="rounded border border-input p-1 text-primary hover:bg-primary/10">
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {expanded && (
                    <div className="border-t border-border bg-muted/30 px-4 py-3">
                      <ItemDetail item={item} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm hover:bg-muted">
              <ArrowLeft className="h-4 w-4" /> Retour
            </button>
            <button onClick={() => setStep(3)}
              disabled={cart.length === 0 || hasPerimeterErrors}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              Suivant <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Summary */}
      {step === 3 && (
        <div className="max-w-lg space-y-4">
          <div className="rounded-lg border border-border p-4 space-y-3">
            <h2 className="font-medium">Recapitulatif</h2>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Evenement :</span> {motif}</p>
              <p><span className="text-muted-foreground">Lieu :</span> {lieuEvenement}</p>
              <p><span className="text-muted-foreground">Dates :</span> {dateDebut} → {dateFin}</p>
            </div>
            <hr className="border-border" />
            <p className="text-sm font-medium">Materiel demande :</p>
            <div className="space-y-2 text-sm">
              {Object.entries(
                cart.reduce<Record<string, CartItem[]>>((groups, item) => {
                  const cat = item.categorie || 'Autre';
                  (groups[cat] ??= []).push(item);
                  return groups;
                }, {})
              ).map(([cat, items]) => (
                <div key={cat}>
                  <p className="font-medium text-muted-foreground">{cat}</p>
                  <ul className="ml-3 space-y-0.5">
                    {items.map((c) => (
                      <li key={c.itemId}>— {c.quantiteDemandee}x {c.nom}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {createReservation.error && (
            <p className="text-sm text-destructive">
              {(createReservation.error as any)?.response?.data?.error?.message || 'Erreur lors de la creation'}
            </p>
          )}

          <div className="flex gap-2">
            <button onClick={() => setStep(2)}
              className="flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm hover:bg-muted">
              <ArrowLeft className="h-4 w-4" /> Modifier
            </button>
            <button onClick={handleSubmit} disabled={createReservation.isPending}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <Check className="h-4 w-4" />
              {createReservation.isPending ? 'Envoi...' : 'Envoyer la demande'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
