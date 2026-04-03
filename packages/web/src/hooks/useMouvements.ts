import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface MouvementsFilters {
  itemId?: number;
  utilisateurId?: number;
  typeMouvement?: string;
  reservationId?: number;
  page?: number;
  limit?: number;
}

export function useMouvements(filters: MouvementsFilters = {}) {
  const params = new URLSearchParams();
  if (filters.itemId) params.set('itemId', String(filters.itemId));
  if (filters.utilisateurId) params.set('utilisateurId', String(filters.utilisateurId));
  if (filters.typeMouvement) params.set('typeMouvement', filters.typeMouvement);
  if (filters.reservationId) params.set('reservationId', String(filters.reservationId));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  return useQuery({
    queryKey: ['mouvements', filters],
    queryFn: async () => {
      const { data } = await api.get(`/mouvements?${params}`);
      return data.data;
    },
  });
}

export function useCreateSortie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { reservationId?: number; lignes: { itemId: number; quantite: number; etatConstate?: string; commentaire?: string }[] }) => {
      const { data } = await api.post('/mouvements/sortie', payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mouvements'] });
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useCreateRetour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { reservationId?: number; lignes: { itemId: number; quantite: number; etatConstate?: string; commentaire?: string }[] }) => {
      const { data } = await api.post('/mouvements/retour', payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mouvements'] });
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useCreateConsommation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { itemId: number; quantite: number; commentaire?: string }) => {
      const { data } = await api.post('/mouvements/consommation', payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mouvements'] });
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
