import { useMemo, useState } from 'react';
import {
  useUsers,
  useCreateUser,
  useDeactivateUser,
  useUpdateUser,
  useResetUserPassword,
} from '../../hooks/useUsers';
import { useAuthStore } from '../../stores/auth';
import { Role } from '../../shared/index';
import type { UtilisateurPublic } from '../../shared/index';
import {
  UserPlus,
  X,
  Shield,
  User as UserIcon,
  Search,
  Settings2,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

function generatePassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let p = '';
  for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

function RoleBadge({ role }: { role: Role | string }) {
  const isAdmin = role === 'admin';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        isAdmin ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
      }`}
    >
      {isAdmin ? <Shield className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
      {isAdmin ? 'Admin' : 'Membre'}
    </span>
  );
}

function errMsg(error: unknown, fallback = 'Une erreur est survenue') {
  return (error as any)?.response?.data?.error?.message || fallback;
}

function ManageUserModal({
  user,
  currentUserId,
  onClose,
}: {
  user: UtilisateurPublic;
  currentUserId?: number;
  onClose: () => void;
}) {
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();
  const resetPassword = useResetUserPassword();

  const [role, setRole] = useState<Role>(user.role as Role);
  const [roleSaved, setRoleSaved] = useState(false);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const isSelf = user.id === currentUserId;

  const handleSaveRole = () => {
    setRoleSaved(false);
    updateUser.mutate(
      { id: user.id, role },
      { onSuccess: () => setRoleSaved(true) }
    );
  };

  const handleToggleActive = () => {
    if (user.actif) {
      if (confirm(`Desactiver le compte de ${user.prenom} ${user.nom} ?`)) {
        deactivateUser.mutate(user.id);
      }
    } else {
      updateUser.mutate({ id: user.id, actif: true });
    }
  };

  const handleReset = () => {
    setResetDone(false);
    resetPassword.mutate(
      { id: user.id, password },
      { onSuccess: () => setResetDone(true) }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-background shadow-lg">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold">Gerer l'utilisateur</h2>
            <p className="text-sm text-muted-foreground">
              {user.prenom} {user.nom} — {user.email}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          {/* Role */}
          <section>
            <label className="mb-1 block text-sm font-medium">Role</label>
            <div className="flex gap-2">
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as Role);
                  setRoleSaved(false);
                }}
                className={inputClass}
              >
                <option value={Role.MEMBRE}>Membre</option>
                <option value={Role.ADMIN}>Administrateur</option>
              </select>
              <button
                onClick={handleSaveRole}
                disabled={role === user.role || updateUser.isPending}
                className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Enregistrer
              </button>
            </div>
            {roleSaved && role === user.role && (
              <p className="mt-1 flex items-center gap-1 text-xs text-success">
                <Check className="h-3 w-3" /> Role mis a jour
              </p>
            )}
          </section>

          <hr className="border-border" />

          {/* Status */}
          <section>
            <label className="mb-1 block text-sm font-medium">Statut du compte</label>
            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  user.actif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {user.actif ? 'Actif' : 'Desactive'}
              </span>
              {isSelf ? (
                <span className="text-xs text-muted-foreground">Votre propre compte</span>
              ) : (
                <button
                  onClick={handleToggleActive}
                  disabled={deactivateUser.isPending || updateUser.isPending}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                    user.actif
                      ? 'border-input text-destructive hover:bg-red-50'
                      : 'border-input text-success hover:bg-green-50'
                  }`}
                >
                  {user.actif ? 'Desactiver le compte' : 'Reactiver le compte'}
                </button>
              )}
            </div>
          </section>

          <hr className="border-border" />

          {/* Reset password */}
          <section>
            <label className="mb-1 block text-sm font-medium">Reinitialiser le mot de passe</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Definissez un mot de passe temporaire. L'utilisateur le recevra par email et pourra le
              changer apres connexion.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={password}
                  minLength={8}
                  placeholder="Mot de passe temporaire"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setResetDone(false);
                  }}
                  className={inputClass + ' pr-9'}
                />
                {password && (
                  <button
                    type="button"
                    title="Copier"
                    onClick={() => {
                      navigator.clipboard?.writeText(password);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </button>
                )}
              </div>
              <button
                type="button"
                title="Generer"
                onClick={() => {
                  setPassword(generatePassword());
                  setResetDone(false);
                }}
                className="shrink-0 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={handleReset}
              disabled={password.length < 8 || resetPassword.isPending}
              className="mt-2 flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" />
              {resetPassword.isPending ? 'Reinitialisation...' : 'Reinitialiser le mot de passe'}
            </button>
            {resetDone && (
              <p className="mt-2 flex items-center gap-1 text-xs text-success">
                <Check className="h-3 w-3" /> Mot de passe reinitialise (email envoye a l'utilisateur)
              </p>
            )}
            {resetPassword.error && (
              <p className="mt-2 text-xs text-destructive">{errMsg(resetPassword.error)}</p>
            )}
          </section>

          {updateUser.error && (
            <p className="text-xs text-destructive">{errMsg(updateUser.error)}</p>
          )}
          {deactivateUser.error && (
            <p className="text-xs text-destructive">{errMsg(deactivateUser.error)}</p>
          )}
        </div>

        <div className="flex justify-end border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const currentUser = useAuthStore((s) => s.user);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', role: Role.MEMBRE as Role });
  const [query, setQuery] = useState('');
  const [managedId, setManagedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = users ?? [];
    if (!q) return list;
    return list.filter(
      (u) =>
        `${u.prenom} ${u.nom}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.role === 'admin' ? 'admin administrateur' : 'membre').includes(q)
    );
  }, [users, query]);

  // Keep the managed user in sync with the freshest list data.
  const managedUser = managedId != null ? users?.find((u) => u.id === managedId) ?? null : null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate(form, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ nom: '', prenom: '', email: '', password: '', role: Role.MEMBRE });
      },
    });
  };

  return (
    <div className="p-4 pb-20 lg:p-6 lg:pb-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Utilisateurs</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {showForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {showForm ? 'Annuler' : 'Nouveau compte'}
        </button>
      </div>

      {/* Create user form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-border p-4 space-y-3">
          <h2 className="font-medium">Creer un compte</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Prenom</label>
              <input required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm">Nom</label>
              <input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm">Email</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm">Mot de passe temporaire</label>
              <input type="text" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={inputClass + ' sm:w-auto'}>
              <option value={Role.MEMBRE}>Membre</option>
              <option value={Role.ADMIN}>Administrateur</option>
            </select>
          </div>

          {createUser.error && <p className="text-sm text-destructive">{errMsg(createUser.error, 'Erreur')}</p>}

          <button type="submit" disabled={createUser.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {createUser.isPending ? 'Creation...' : 'Creer le compte'}
          </button>
        </form>
      )}

      {/* Search bar */}
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nom, email ou role..."
          className={inputClass + ' pl-9'}
        />
      </div>

      {/* Users list */}
      {isLoading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3">{u.prenom} {u.nom}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${u.actif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {u.actif ? 'Actif' : 'Desactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setManagedId(u.id)}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Settings2 className="h-3.5 w-3.5" /> Gerer
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Aucun utilisateur ne correspond a la recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {managedUser && (
        <ManageUserModal
          user={managedUser}
          currentUserId={currentUser?.id}
          onClose={() => setManagedId(null)}
        />
      )}
    </div>
  );
}
