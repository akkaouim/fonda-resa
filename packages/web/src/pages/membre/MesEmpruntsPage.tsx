import { useState } from 'react';
import { useReservations, useCancelReservation, useDuplicateReservation } from '../../hooks/useReservations';
import { useNavigate } from 'react-router-dom';
import { Clock, Copy, X, ChevronDown, ChevronUp } from 'lucide-react';

const STATUT_STYLES: Record<string, { label: string; color: string }> = {
  en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  validee: { label: 'Validee', color: 'bg-green-100 text-green-800' },
  refusee: { label: 'Refusee', color: 'bg-red-100 text-red-800' },
  annulee: { label: 'Annulee', color: 'bg-gray-100 text-gray-600' },
  terminee: { label: 'Terminee', color: 'bg-blue-100 text-blue-800' },
};

export default function MesEmpruntsPage() {
  const [statutFilter, setStatutFilter] = useState<string | undefined>();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data, isLoading } = useReservations({ statut: statutFilter });
  const cancelResa = useCancelReservation();
  const duplicateResa = useDuplicateReservation();
  const navigate = useNavigate();

  const handleDuplicate = (id: number) => {
    duplicateResa.mutate(id, {
      onSuccess: (data) => {
        // Store prefill data and navigate to form
        sessionStorage.setItem('reservationPrefill', JSON.stringify(data));
        navigate('/reserver');
      },
    });
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="p-4 pb-20 lg:p-6 lg:pb-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Clock className="h-6 w-6" /> Mes emprunts
        </h1>
        <select value={statutFilter || ''} onChange={(e) => setStatutFilter(e.target.value || undefined)}
          className="rounded-md border border-input px-3 py-1.5 text-sm">
          <option value="">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="validee">Validees</option>
          <option value="refusee">Refusees</option>
          <option value="annulee">Annulees</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : data?.items.length === 0 ? (
        <p className="text-muted-foreground">Aucune reservation pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {data?.items.map((r: any) => {
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
