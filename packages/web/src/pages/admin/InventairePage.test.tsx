import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InventairePage from './InventairePage';

vi.mock('../../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
import { api } from '../../lib/api';

const ITEM = {
  id: 42,
  nom: 'Cable HDMI 5m',
  description: 'Cable video',
  categorieId: 1,
  sousCategorieId: null,
  quantiteStock: 3,
  etat: 'bon',
  commentaireEtat: '',
  localisationId: 1,
  perimetreUtilisation: 'libre',
  marquage: 'CBL-042',
  typeItem: 'equipement',
  notes: '',
  valeurEstimee: 12,
  photoUrls: ['/uploads/photos/a.jpg'],
  actif: true,
  categorie: { id: 1, nom: 'Cables' },
  localisation: { id: 1, nom: 'Grande salle' },
};

afterEach(cleanup);

beforeEach(() => {
  vi.mocked(api.get).mockImplementation(((url: string) => {
    if (url.startsWith('/items')) {
      return Promise.resolve({
        data: { success: true, data: { items: [ITEM], total: 1, page: 1, limit: 50, totalPages: 1 } },
      });
    }
    if (url === '/categories') {
      return Promise.resolve({ data: { success: true, data: [{ id: 1, nom: 'Cables', sousCategories: [] }] } });
    }
    return Promise.resolve({ data: { success: true, data: [{ id: 1, nom: 'Grande salle', estSurSite: true }] } });
  }) as never);
  vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: { id: 99 } } });
  vi.mocked(api.put).mockResolvedValue({ data: { success: true, data: {} } });
});

async function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <InventairePage />
    </QueryClientProvider>
  );
  await screen.findByText('Cable HDMI 5m');
}

describe('duplicating an item', () => {
  it('opens the form as an addition, not as an edit', async () => {
    await renderPage();

    await userEvent.click(screen.getByLabelText('Dupliquer Cable HDMI 5m'));

    expect(screen.getByText('Ajouter un item')).toBeTruthy();
  });

  it('prefills the copy and marks the name, leaving the marking blank', async () => {
    await renderPage();

    await userEvent.click(screen.getByLabelText('Dupliquer Cable HDMI 5m'));

    expect(screen.getByDisplayValue('Cable HDMI 5m (copie)')).toBeTruthy();
    expect(screen.queryByDisplayValue('CBL-042')).toBeNull();
  });

  it('creates a new item and never touches the source', async () => {
    await renderPage();
    await userEvent.click(screen.getByLabelText('Dupliquer Cable HDMI 5m'));

    await userEvent.click(screen.getByRole('button', { name: 'Creer' }));

    await waitFor(() => expect(vi.mocked(api.post)).toHaveBeenCalled());
    expect(vi.mocked(api.post).mock.calls[0][0]).toBe('/items');
    expect(vi.mocked(api.put)).not.toHaveBeenCalled();
  });

  it('does not carry the copy over into a later blank addition', async () => {
    await renderPage();
    await userEvent.click(screen.getByLabelText('Dupliquer Cable HDMI 5m'));
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    await userEvent.click(screen.getByRole('button', { name: /Ajouter/ }));

    expect(screen.queryByDisplayValue('Cable HDMI 5m (copie)')).toBeNull();
  });

  it('does not carry the copy over when the panel is closed from the toolbar', async () => {
    await renderPage();
    await userEvent.click(screen.getByLabelText('Dupliquer Cable HDMI 5m'));

    await userEvent.click(screen.getByRole('button', { name: /Fermer/ }));
    await userEvent.click(screen.getByRole('button', { name: /Ajouter/ }));

    expect(screen.getByText('Ajouter un item')).toBeTruthy();
    expect(screen.queryByDisplayValue('Cable HDMI 5m (copie)')).toBeNull();
  });

  it('starts the copy without photos, so no two items share a file', async () => {
    await renderPage();

    await userEvent.click(screen.getByLabelText('Dupliquer Cable HDMI 5m'));

    expect(screen.getByText('0/6')).toBeTruthy();
  });

  it('still edits in place when the pencil is used', async () => {
    await renderPage();

    await userEvent.click(screen.getByLabelText('Modifier Cable HDMI 5m'));

    expect(screen.getByText("Modifier l'item")).toBeTruthy();
  });
});
