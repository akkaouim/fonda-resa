import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useResetPassword } from '../../hooks/useAuth';
import { ArrowLeft, Check } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const reset = useResetPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return;
    reset.mutate({ token, password });
  };

  if (!token) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted p-4">
        <div className="w-full max-w-md rounded-lg bg-background p-8 shadow-lg text-center">
          <p className="text-destructive">Lien invalide. Veuillez refaire une demande.</p>
          <Link to="/forgot-password" className="mt-4 inline-block text-sm text-primary hover:underline">
            Nouvelle demande
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md rounded-lg bg-background p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-semibold">Nouveau mot de passe</h1>

        {reset.isSuccess ? (
          <div className="space-y-4 text-center">
            <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
              <Check className="mx-auto mb-2 h-8 w-8" />
              Mot de passe reinitialise avec succes.
            </div>
            <Link to="/login" className="inline-block text-sm text-primary hover:underline">
              Se connecter
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium">
                Nouveau mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1 block text-sm font-medium">
                Confirmer le mot de passe
              </label>
              <input
                id="confirm"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {password && confirm && password !== confirm && (
                <p className="mt-1 text-sm text-destructive">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            {reset.error && (
              <p className="text-sm text-destructive">
                {(reset.error as any)?.response?.data?.error?.message || 'Erreur'}
              </p>
            )}

            <button
              type="submit"
              disabled={reset.isPending || password !== confirm}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {reset.isPending ? 'Reinitialisation...' : 'Reinitialiser'}
            </button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour a la connexion
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
