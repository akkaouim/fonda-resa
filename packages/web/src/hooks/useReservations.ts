import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useReservations(filters: { statut?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.statut) params.set('statut', filters.statut);
  if (filters.page) params.set('page', String(filters.page));

  return useQuery({
    queryKey: ['reservations', filters],
    queryFn: async () => {
      const { data } = await api.get(`/reservations?${params}`);
      return data.data;
    },
  });
}

export function useReservation(id: number | null) {
  return useQuery({
    queryKey: ['reservations', id],
    queryFn: async () => {
      const { data } = await api.get(`/reservations/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (resaData: any) => {
      const { data } = await api.post('/reservations', resaData);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  });
}

export function useCancelReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/reservations/${id}`);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  });
}

export function useApproveReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, commentaire }: { id: number; commentaire?: string }) => {
      const { data } = await api.post(`/reservations/${id}/approve`, { commentaire });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  });
}

export function useRejectReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, commentaire }: { id: number; commentaire?: string }) => {
      const { data } = await api.post(`/reservations/${id}/reject`, { commentaire });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  });
}

export function useDuplicateReservation() {
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`/reservations/${id}/duplicate`);
      return data.data;
    },
  });
}

export function useItemAvailability(itemId: number | null, dateDebut?: string, dateFin?: string) {
  return useQuery({
    queryKey: ['availability', itemId, dateDebut, dateFin],
    queryFn: async () => {
      const { data } = await api.get(`/reservations/availability/${itemId}?dateDebut=${dateDebut}&dateFin=${dateFin}`);
      return data.data as { itemId: number; quantiteStock: number; quantiteDisponible: number };
    },
    enabled: !!itemId && !!dateDebut && !!dateFin,
  });
}
