import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  LayoutDashboard,
  Clock,
  AlertTriangle,
  Wrench,
  Package,
  ArrowLeftRight,
  MapPin,
} from 'lucide-react';

const STATUT_STYLES: Record<string, { label: string; color: string }> = {
  en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  validee: { label: 'Validee', color: 'bg-green-100 text-green-800' },
  refusee: { label: 'Refusee', color: 'bg-red-100 text-red-800' },
  annulee: { label: 'Annulee', color: 'bg-gray-100 text-gray-600' },
  terminee: { label: 'Terminee', color: 'bg-blue-100 text-blue-800' },
};

const TYPE_MOUVEMENT_LABELS: Record<string, string> = {
  sortie: 'Sortie',
  retour: 'Retour',
  consommation: 'Consommation',
};

function useDashboard() {
  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard');
      return data.data;
    },
  });
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useDashboard();

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  if (isLoading) {
    return (
      <div className="p-4 pb-20 lg:p-6 lg:pb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <LayoutDashboard className="h-6 w-6" /> Tableau de bord
        </h1>
        <p className="mt-4 text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 lg:p-6 lg:pb-6">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold">
        <LayoutDashboard className="h-6 w-6" /> Tableau de bord
      </h1>

      {/* Alert cards */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          onClick={() => navigate('/admin/demandes')}
          className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-left transition-colors hover:bg-yellow-100"
        >
          <Clock className="h-5 w-5 text-yellow-600" />
          <div>
            <div className="text-2xl font-bold text-yellow-800">{data?.reservationsEnAttente ?? 0}</div>
            <div className="text-sm text-yellow-700">demande{(data?.reservationsEnAttente ?? 0) > 1 ? 's' : ''} en attente</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/admin/demandes')}
          className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-left transition-colors hover:bg-red-100"
        >
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div>
            <div className="text-2xl font-bold text-red-800">{data?.retoursEnRetard ?? 0}</div>
            <div className="text-sm text-red-700">retour{(data?.retoursEnRetard ?? 0) > 1 ? 's' : ''} en retard</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/admin/inventaire')}
          className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-left transition-colors hover:bg-orange-100"
        >
          <Wrench className="h-5 w-5 text-orange-600" />
          <div>
            <div className="text-2xl font-bold text-orange-800">{data?.itemsAReparer ?? 0}</div>
            <div className="text-sm text-orange-700">item{(data?.itemsAReparer ?? 0) > 1 ? 's' : ''} a reparer</div>
          </div>
        </button>
      </div>

      {/* Recent requests */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-medium">Demandes recentes</h2>
        {data?.reservationsRecentes?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune reservation.</p>
        ) : (
          <div className="space-y-2">
            {data?.reservationsRecentes?.map((r: any) => {
              const s = STATUT_STYLES[r.statut] || STATUT_STYLES.en_attente;
              return (
                <div
                  key={r.id}
                  className="rounded-lg border border-border p-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>
                      {s.label}
                    </span>
                    <span className="font-medium">{r.motif}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{r.utilisateur.prenom} {r.utilisateur.nom}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(r.dateDebut)} → {formatDate(r.dateFin)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {r.lignes.length} item{r.lignes.length > 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {r.lieuEvenement}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Low stock consumables */}
      {data?.consommablesBas?.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-medium">Alertes consommables</h2>
          <div className="rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2 text-right">Stock</th>
                </tr>
              </thead>
              <tbody>
                {data.consommablesBas.map((item: any) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{item.nom}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.quantiteStock <= 2
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.quantiteStock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent movements */}
      <div>
        <h2 className="mb-3 text-lg font-medium">Mouvements recents</h2>
        {data?.mouvementsRecents?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun mouvement.</p>
        ) : (
          <div className="space-y-2">
            {data?.mouvementsRecents?.map((m: any) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <ArrowLeftRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {TYPE_MOUVEMENT_LABELS[m.typeMouvement] || m.typeMouvement} — {m.item.nom}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.utilisateur.prenom} {m.utilisateur.nom} · Quantite: {m.quantite} · {formatDateTime(m.dateEffective)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
