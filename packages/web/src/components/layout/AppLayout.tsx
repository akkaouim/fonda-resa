import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { useLogout } from '../../hooks/useAuth';
import {
  Home,
  Package,
  CalendarPlus,
  Clock,
  LayoutDashboard,
  Database,
  CheckSquare,
  ArrowLeftRight,
  Users,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const memberNav = [
  { to: '/', icon: Home, label: 'Accueil' },
  { to: '/materiel', icon: Package, label: 'Materiel' },
  { to: '/reserver', icon: CalendarPlus, label: 'Reserver' },
  { to: '/mes-emprunts', icon: Clock, label: 'Mes emprunts' },
];

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/admin/inventaire', icon: Database, label: 'Inventaire' },
  { to: '/admin/demandes', icon: CheckSquare, label: 'Demandes' },
  { to: '/admin/mouvements', icon: ArrowLeftRight, label: 'Entrees/Sorties' },
  { to: '/admin/utilisateurs', icon: Users, label: 'Utilisateurs' },
];

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/' || to === '/admin'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-primary/10 font-medium text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

export default function AppLayout() {
  const { user, isAdmin } = useAuthStore();
  const logout = useLogout();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout.mutate(undefined, { onSuccess: () => navigate('/login') });
  };

  return (
    <div className="flex min-h-svh">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-background transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <h1 className="text-lg font-semibold">Resa Esviere</h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="mb-1 px-3 text-xs font-medium uppercase text-muted-foreground">Menu</p>
          {memberNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}

          {isAdmin && (
            <>
              <hr className="my-3 border-border" />
              <p className="mb-1 px-3 text-xs font-medium uppercase text-muted-foreground">Administration</p>
              {adminNav.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </>
          )}
        </nav>

        <div className="border-t border-border p-3 space-y-1">
          <NavLink
            to="/profil"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted'
              }`
            }
          >
            <User className="h-4 w-4" />
            <span>{user?.prenom} {user?.nom}</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span>Se deconnecter</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="flex items-center border-b border-border px-4 py-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="ml-3 text-lg font-semibold">Resa Esviere</h1>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav (mobile only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-border bg-background lg:hidden">
        {memberNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2 text-xs ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
