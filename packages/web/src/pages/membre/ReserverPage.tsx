import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useItems, useLocalisations } from '../../hooks/useItems';
import { useCreateReservation } from '../../hooks/useReservations';
import { CalendarPlus, ArrowRight, ArrowLeft, Search, Plus, Minus, AlertTriangle, Check, X } from 'lucide-react';

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

  const { data: localisations } = useLocalisations();
  const { data: itemsData } = useItems({ search: searchTerm || undefined, limit: 100 });
  const createReservation = useCreateReservation();

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

          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            {itemsData?.items.map((item: any) => {
              const inCart = cart.find((c) => c.itemId === item.id);
              return (
                <div key={item.id} className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-0">
                  <div>
                    <span className={inCart ? 'font-medium text-primary' : ''}>{item.nom}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{item.categorie?.nom}</span>
                    {item.perimetreUtilisation !== 'libre' && (
                      <span className={`ml-2 inline-block rounded px-1 py-0.5 text-xs ${
                        item.perimetreUtilisation === 'sur_le_site' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {item.perimetreUtilisation === 'sur_le_site' ? 'Sur le site' : 'Sur place'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{item.quantiteStock} dispo</span>
                    {inCart ? (
                      <span className="text-xs text-primary">Ajoute</span>
                    ) : (
                      <button onClick={() => addToCart(item)}
                        className="rounded border border-input p-1 text-primary hover:bg-primary/10">
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </div>
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
            <ul className="space-y-1 text-sm">
              {cart.map((c) => (
                <li key={c.itemId}>— {c.quantiteDemandee}x {c.nom}</li>
              ))}
            </ul>
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
