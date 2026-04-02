import { useState } from 'react';
import { useUsers, useCreateUser, useDeactivateUser } from '../../hooks/useUsers';
import { Role } from '@resa-esviere/shared';
import { UserPlus, X, Shield, User as UserIcon } from 'lucide-react';

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const deactivateUser = useDeactivateUser();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', role: Role.MEMBRE as Role });

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
              <input
                required
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">Nom</label>
              <input
                required
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">Mot de passe temporaire</label>
              <input
                type="text"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value={Role.MEMBRE}>Membre</option>
              <option value={Role.ADMIN}>Administrateur</option>
            </select>
          </div>

          {createUser.error && (
            <p className="text-sm text-destructive">
              {(createUser.error as any)?.response?.data?.error?.message || 'Erreur'}
            </p>
          )}

          <button
            type="submit"
            disabled={createUser.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createUser.isPending ? 'Creation...' : 'Creer le compte'}
          </button>
        </form>
      )}

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
              {users?.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    {u.prenom} {u.nom}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === 'admin'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {u.role === 'admin' ? <Shield className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                      {u.role === 'admin' ? 'Admin' : 'Membre'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.actif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {u.actif ? 'Actif' : 'Desactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.actif && (
                      <button
                        onClick={() => {
                          if (confirm(`Desactiver le compte de ${u.prenom} ${u.nom} ?`)) {
                            deactivateUser.mutate(u.id);
                          }
                        }}
                        className="text-xs text-destructive hover:underline"
                      >
                        Desactiver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
