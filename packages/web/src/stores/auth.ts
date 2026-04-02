import { create } from 'zustand';
import type { UtilisateurPublic } from '@resa-esviere/shared';
import { Role } from '@resa-esviere/shared';

interface AuthState {
  user: UtilisateurPublic | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setUser: (user: UtilisateurPublic | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === Role.ADMIN,
    }),
  logout: () => {
    sessionStorage.removeItem('accessToken');
    set({ user: null, isAuthenticated: false, isAdmin: false });
  },
}));
