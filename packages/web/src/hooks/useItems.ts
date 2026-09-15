import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface ItemsResponse {
  items: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ItemFilters {
  search?: string;
  categorieId?: number;
  sousCategorieId?: number;
  etat?: string;
  typeItem?: string;
  localisationId?: number;
  page?: number;
  limit?: number;
}

export function useItems(filters: ItemFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.categorieId) params.set('categorieId', String(filters.categorieId));
  if (filters.sousCategorieId) params.set('sousCategorieId', String(filters.sousCategorieId));
  if (filters.etat) params.set('etat', filters.etat);
  if (filters.typeItem) params.set('typeItem', filters.typeItem);
  if (filters.localisationId) params.set('localisationId', String(filters.localisationId));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  return useQuery({
    queryKey: ['items', filters],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: ItemsResponse }>(`/items?${params}`);
      return data.data;
    },
  });
}

export function useItem(id: number | null) {
  return useQuery({
    queryKey: ['items', id],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: any }>(`/items/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Record<string, any>) => {
      const { data } = await api.post('/items', item);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...item }: Record<string, any> & { id: number }) => {
      const { data } = await api.put(`/items/${id}`, item);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/items/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useImportItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Record<string, any>[]) => {
      const { data } = await api.post('/items/import', { rows });
      return data.data as { created: number; errors: { row: number; message: string }[] };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: any[] }>('/categories');
      return data.data;
    },
  });
}

export function useLocalisations() {
  return useQuery({
    queryKey: ['localisations'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: any[] }>('/localisations');
      return data.data;
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nom: string) => {
      const { data } = await api.post('/categories', { nom });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useCreateSubCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: { nom: string; categorieId: number }) => {
      const { data } = await api.post('/categories/sous-categories', d);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useCreateLocalisation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: { nom: string; estSurSite: boolean; description?: string }) => {
      const { data } = await api.post('/localisations', d);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['localisations'] }),
  });
}

export function useUpdateLocalisation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...d }: { id: number; nom: string; estSurSite: boolean; description?: string }) => {
      const { data } = await api.put(`/localisations/${id}`, d);
      return data.data;
    },
    // Items display their localisation name, so a rename must refresh them too.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['localisations'] });
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useDeleteLocalisation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/localisations/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['localisations'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nom }: { id: number; nom: string }) => {
      const { data } = await api.put(`/categories/${id}`, { nom });
      return data.data;
    },
    // The inventory table prints the category name, so a rename must refresh it.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateSubCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...d }: { id: number; nom: string; categorieId: number }) => {
      const { data } = await api.put(`/categories/sous-categories/${id}`, d);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useDeleteSubCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/categories/sous-categories/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}
