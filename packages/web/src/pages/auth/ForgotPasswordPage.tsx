import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../../hooks/useAuth';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const forgot = useForgotPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgot.mutate(email);
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md rounded-lg bg-background p-8 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-semibold">Mot de passe oublie</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Entrez votre adresse email pour recevoir un lien de reinitialisation.
        </p>

        {forgot.isSuccess ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 p-4 text-center text-sm text-green-800">
              <Mail className="mx-auto mb-2 h-8 w-8" />
              Si cette adresse existe, un email a ete envoye avec un lien de reinitialisation.
            </div>
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour a la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="votre@email.fr"
              />
            </div>

            <button
              type="submit"
              disabled={forgot.isPending}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {forgot.isPending ? 'Envoi...' : 'Envoyer le lien'}
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
