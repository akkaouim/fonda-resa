import { useState } from 'react';
import { useReservations, useApproveReservation, useRejectReservation } from '../../hooks/useReservations';
import { CheckSquare, Check, X, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

const STATUT_STYLES: Record<string, { label: string; color: string }> = {
  en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  validee: { label: 'Validee', color: 'bg-green-100 text-green-800' },
  refusee: { label: 'Refusee', color: 'bg-red-100 text-red-800' },
  annulee: { label: 'Annulee', color: 'bg-gray-100 text-gray-600' },
  terminee: { label: 'Terminee', color: 'bg-blue-100 text-blue-800' },
};

export default function DemandesPage() {
  const [statutFilter, setStatutFilter] = useState<string>('en_attente');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [showComment, setShowComment] = useState<number | null>(null);

  const { data, isLoading } = useReservations({ statut: statutFilter || undefined });
  const approve = useApproveReservation();
  const reject = useRejectReservation();

  const handleApprove = (id: number) => {
    approve.mutate({ id, commentaire: commentaire || undefined }, {
      onSuccess: () => { setCommentaire(''); setShowComment(null); },
    });
  };

  const handleReject = (id: number) => {
    reject.mutate({ id, commentaire: commentaire || undefined }, {
      onSuccess: () => { setCommentaire(''); setShowComment(null); },
    });
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="p-4 pb-20 lg:p-6 lg:pb-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <CheckSquare className="h-6 w-6" /> Demandes de reservation
        </h1>
        <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)}
          className="rounded-md border border-input px-3 py-1.5 text-sm">
          <option value="en_attente">En attente</option>
          <option value="validee">Validees</option>
          <option value="refusee">Refusees</option>
          <option value="">Toutes</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : data?.items.length === 0 ? (
        <p className="text-muted-foreground">
          {statutFilter === 'en_attente' ? 'Aucune demande en attente.' : 'Aucune reservation trouvee.'}
        </p>
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
                      {r.utilisateur.prenom} {r.utilisateur.nom} · {formatDate(r.dateDebut)} → {formatDate(r.dateFin)} · {r.lignes.length} item{r.lignes.length > 1 ? 's' : ''} · {r.lieuEvenement}
                    </div>
                  </div>
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {expanded && (
                  <div className="border-t border-border p-3 space-y-3">
                    <div>
                      <p className="mb-1 text-sm font-medium">Materiel demande :</p>
                      <ul className="space-y-1 text-sm">
                        {r.lignes.map((l: any) => (
                          <li key={l.id}>
                            {l.quantiteDemandee}x {l.item.nom}
                            <span className="text-xs text-muted-foreground"> (stock: {l.item.quantiteStock})</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {r.commentaireAdmin && (
                      <p className="text-sm"><span className="text-muted-foreground">Note :</span> {r.commentaireAdmin}</p>
                    )}

                    {r.statut === 'en_attente' && (
                      <div className="space-y-2">
                        {showComment === r.id ? (
                          <div>
                            <textarea
                              value={commentaire}
                              onChange={(e) => setCommentaire(e.target.value)}
                              placeholder="Commentaire (optionnel)..."
                              rows={2}
                              className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        ) : (
                          <button onClick={() => setShowComment(r.id)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                            <MessageSquare className="h-3 w-3" /> Ajouter un commentaire
                          </button>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(r.id)} disabled={approve.isPending}
                            className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                            <Check className="h-4 w-4" /> Valider
                          </button>
                          <button onClick={() => handleReject(r.id)} disabled={reject.isPending}
                            className="flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                            <X className="h-4 w-4" /> Refuser
                          </button>
                        </div>
                      </div>
                    )}
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
