import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth';
import type { UtilisateurPublic } from '../shared/index';

export function useCurrentUser() {
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const token = sessionStorage.getItem('accessToken');
      if (!token) return null;
      try {
        const { data } = await api.get<{ success: boolean; data: UtilisateurPublic }>('/auth/me');
        setUser(data.data);
        return data.data;
      } catch {
        setUser(null);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data } = await api.post<{
        success: boolean;
        data: { accessToken: string; user: UtilisateurPublic };
      }>('/auth/login', { email, password });
      return data.data;
    },
    onSuccess: (data) => {
      sessionStorage.setItem('accessToken', data.accessToken);
      setUser(data.user);
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      logout();
      queryClient.clear();
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const { data } = await api.post('/auth/change-password', { currentPassword, newPassword });
      return data;
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post('/auth/forgot-password', { email });
      return data;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      const { data } = await api.post('/auth/reset-password', { token, password });
      return data;
    },
  });
}
