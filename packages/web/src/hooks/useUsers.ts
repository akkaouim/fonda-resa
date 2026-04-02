import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { UtilisateurPublic, CreateUserRequest, UpdateUserRequest } from '@resa-esviere/shared';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: UtilisateurPublic[] }>('/users');
      return data.data;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: CreateUserRequest) => {
      const { data } = await api.post<{ success: boolean; data: UtilisateurPublic }>('/users', userData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...userData }: UpdateUserRequest & { id: number }) => {
      const { data } = await api.put<{ success: boolean; data: UtilisateurPublic }>(`/users/${id}`, userData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch<{ success: boolean; data: UtilisateurPublic }>(`/users/${id}/deactivate`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
