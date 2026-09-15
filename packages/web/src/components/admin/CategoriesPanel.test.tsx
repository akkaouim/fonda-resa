import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CategoriesPanel from './CategoriesPanel';

// Mock only the network boundary, so the real hooks, the real query client and
// the real component are all exercised.
vi.mock('../../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
import { api } from '../../lib/api';

const CATEGORIES = [
  {
    id: 1,
    nom: 'Cables',
    _count: { items: 7 },
    sousCategories: [
      { id: 10, nom: 'VGA/HDMI', categorieId: 1, _count: { items: 3 } },
      { id: 11, nom: 'Adaptateurs', categorieId: 1, _count: { items: 0 } },
    ],
  },
  { id: 2, nom: 'Pieds', _count: { items: 0 }, sousCategories: [] },
];

afterEach(cleanup);

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: CATEGORIES } });
  vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: {} } });
});

async function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CategoriesPanel onClose={() => {}} />
    </QueryClientProvider>
  );
  await screen.findByText('Cables');
}

describe('CategoriesPanel', () => {
  it('lists categories with their item counts', async () => {
    await renderPanel();

    expect(screen.getByText('Pieds')).toBeTruthy();
    expect(screen.getByText(/2 sous-categories/)).toBeTruthy();
  });

  it('hides sub-categories until the category is expanded', async () => {
    await renderPanel();
    expect(screen.queryByText('VGA/HDMI')).toBeNull();

    await userEvent.click(screen.getByLabelText('Deplier Cables'));

    expect(screen.getByText('VGA/HDMI')).toBeTruthy();
    expect(screen.getByText('Adaptateurs')).toBeTruthy();
  });

  it('blocks deleting a category that still holds items or sub-categories', async () => {
    await renderPanel();

    expect(screen.getByLabelText('Supprimer Cables')).toHaveProperty('disabled', true);
  });

  it('allows deleting an empty category', async () => {
    await renderPanel();

    expect(screen.getByLabelText('Supprimer Pieds')).toHaveProperty('disabled', false);
  });

  it('blocks deleting a sub-category that still holds items', async () => {
    await renderPanel();
    await userEvent.click(screen.getByLabelText('Deplier Cables'));

    expect(screen.getByLabelText('Supprimer VGA/HDMI')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('Supprimer Adaptateurs')).toHaveProperty('disabled', false);
  });

  it('creates a sub-category under the category it was typed in', async () => {
    await renderPanel();
    await userEvent.click(screen.getByLabelText('Deplier Cables'));

    await userEvent.type(screen.getByLabelText('Nouvelle sous-categorie dans Cables'), 'Jack');
    await userEvent.click(screen.getByLabelText('Ajouter une sous-categorie dans Cables'));

    await waitFor(() =>
      expect(vi.mocked(api.post)).toHaveBeenCalledWith('/categories/sous-categories', {
        nom: 'Jack',
        categorieId: 1,
      })
    );
  });

  it('surfaces the server refusal when a delete is rejected', async () => {
    vi.mocked(api.delete).mockRejectedValue({
      response: { data: { error: { message: '"Pieds" ne peut pas etre supprimee : 2 materiels.' } } },
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await renderPanel();

    await userEvent.click(screen.getByLabelText('Supprimer Pieds'));

    expect(await screen.findByText(/ne peut pas etre supprimee/)).toBeTruthy();
  });
});
