import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthGuard, AdminGuard } from './components/layout/AuthGuard';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/membre/DashboardPage';
import ProfilePage from './pages/membre/ProfilePage';
import UsersPage from './pages/admin/UsersPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-4 pb-20 lg:p-6 lg:pb-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted-foreground">Cette page sera implementee dans une prochaine phase.</p>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Auth pages (no layout) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected pages (with layout) */}
          <Route
            element={
              <AuthGuard>
                <AppLayout />
              </AuthGuard>
            }
          >
            {/* Member routes */}
            <Route path="/" element={<DashboardPage />} />
            <Route path="/materiel" element={<PlaceholderPage title="Materiel" />} />
            <Route path="/reserver" element={<PlaceholderPage title="Nouvelle reservation" />} />
            <Route path="/mes-emprunts" element={<PlaceholderPage title="Mes emprunts" />} />
            <Route path="/profil" element={<ProfilePage />} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminGuard><PlaceholderPage title="Tableau de bord admin" /></AdminGuard>} />
            <Route path="/admin/inventaire" element={<AdminGuard><PlaceholderPage title="Inventaire" /></AdminGuard>} />
            <Route path="/admin/demandes" element={<AdminGuard><PlaceholderPage title="Demandes" /></AdminGuard>} />
            <Route path="/admin/mouvements" element={<AdminGuard><PlaceholderPage title="Entrees / Sorties" /></AdminGuard>} />
            <Route path="/admin/utilisateurs" element={<AdminGuard><UsersPage /></AdminGuard>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
