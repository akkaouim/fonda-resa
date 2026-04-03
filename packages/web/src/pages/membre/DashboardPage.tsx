import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { useReservations } from '../../hooks/useReservations';
import { Home, CalendarPlus, Package, MapPin, Clock } from 'lucide-react';

const STATUT_STYLES: Record<string, { label: string; color: string }> = {
  en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  validee: { label: 'Validee', color: 'bg-green-100 text-green-800' },
  sortie: { label: 'Sortie', color: 'bg-orange-100 text-orange-800' },
  retournee: { label: 'Retournee', color: 'bg-blue-100 text-blue-800' },
  refusee: { label: 'Refusee', color: 'bg-red-100 text-red-800' },
  annulee: { label: 'Annulee', color: 'bg-gray-100 text-gray-600' },
  terminee: { label: 'Terminee', color: 'bg-purple-100 text-purple-800' },
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { data, isLoading } = useReservations();

  const activeReservations = data?.items?.filter(
    (r: any) => ['en_attente', 'validee', 'sortie'].includes(r.statut)
  ) ?? [];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="p-4 pb-20 lg:p-6 lg:pb-6">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Home className="h-6 w-6" /> Bonjour, {user?.prenom}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Bienvenue sur Fonda Resa.
        </p>
      </div>

      {/* Quick actions */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-medium">Actions rapides</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/reserver')}
            className="flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50"
          >
            <CalendarPlus className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Nouvelle reservation</span>
          </button>
          <button
            onClick={() => navigate('/materiel')}
            className="flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50"
          >
            <Package className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Voir le materiel</span>
          </button>
        </div>
      </div>

      {/* Active reservations */}
      <div>
        <h2 className="mb-3 text-lg font-medium">Reservations en cours</h2>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : activeReservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune reservation en cours.</p>
        ) : (
          <div className="space-y-3">
            {activeReservations.map((r: any) => {
              const s = STATUT_STYLES[r.statut] || STATUT_STYLES.en_attente;
              return (
                <button
                  key={r.id}
                  onClick={() => navigate('/mes-emprunts')}
                  className="block w-full rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>
                      {s.label}
                    </span>
                    <span className="font-medium text-sm">{r.motif}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(r.dateDebut)} → {formatDate(r.dateFin)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {r.lignes?.length ?? 0} item{(r.lignes?.length ?? 0) > 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {r.lieuEvenement}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
