import { useState } from 'react';
import { useAuthStore } from '../../stores/auth';
import { useChangePassword } from '../../hooks/useAuth';
import { Check } from 'lucide-react';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return;
    setSuccess(false);
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setSuccess(true);
        },
      }
    );
  };

  return (
    <div className="p-4 pb-20 lg:p-6 lg:pb-6">
      <h1 className="mb-6 text-2xl font-semibold">Mon profil</h1>

      <div className="max-w-lg space-y-6">
        {/* User info */}
        <div className="rounded-lg border border-border p-4">
          <h2 className="mb-3 font-medium">Informations</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nom</span>
              <span>{user?.prenom} {user?.nom}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span>{user?.role === 'admin' ? 'Administrateur' : 'Membre'}</span>
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="rounded-lg border border-border p-4">
          <h2 className="mb-3 font-medium">Changer le mot de passe</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm">Mot de passe actuel</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">Nouveau mot de passe</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-sm text-destructive">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            {changePassword.error && (
              <p className="text-sm text-destructive">
                {(changePassword.error as any)?.response?.data?.error?.message || 'Erreur'}
              </p>
            )}

            {success && (
              <p className="flex items-center gap-1 text-sm text-success">
                <Check className="h-4 w-4" />
                Mot de passe modifie avec succes
              </p>
            )}

            <button
              type="submit"
              disabled={changePassword.isPending || newPassword !== confirmPassword}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {changePassword.isPending ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
