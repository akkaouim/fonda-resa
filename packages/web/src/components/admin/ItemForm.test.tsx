import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemForm from './ItemForm';

// Testing Library only auto-registers cleanup when vitest globals are on;
// this config keeps imports explicit, so unmount between tests by hand.
afterEach(cleanup);

// jsdom has no object URLs; the gallery previews pending files with one.
beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:preview', writable: true });
});

const categories = [
  { id: 1, nom: 'Cables', sousCategories: [{ id: 10, nom: 'VGA/HDMI' }] },
  { id: 2, nom: 'Blocs adaptateurs', sousCategories: [] },
];

const localisations = [{ id: 1, nom: 'Grande salle', estSurSite: true }];

function renderForm() {
  render(
    <ItemForm
      categories={categories}
      localisations={localisations}
      onSave={() => {}}
      isSaving={false}
      onCancel={() => {}}
    />
  );
  // The labels are not associated with their controls, so find the category
  // select by the option it offers rather than by label or DOM order.
  const categorySelect = screen
    .getAllByRole('combobox')
    .find((el) => within(el).queryByRole('option', { name: 'Cables' })) as HTMLSelectElement;

  return { categorySelect };
}

describe('ItemForm category selection', () => {
  it('keeps the chosen category selected', async () => {
    const { categorySelect } = renderForm();

    await userEvent.selectOptions(categorySelect, '1');

    expect(categorySelect.value).toBe('1');
  });

  it('offers the sub-categories of the chosen category', async () => {
    const { categorySelect } = renderForm();
    expect(screen.queryByRole('option', { name: 'VGA/HDMI' })).toBeNull();

    await userEvent.selectOptions(categorySelect, '1');

    expect(screen.queryByRole('option', { name: 'VGA/HDMI' })).not.toBeNull();
  });

  it('clears the sub-category when the category changes', async () => {
    const { categorySelect } = renderForm();
    await userEvent.selectOptions(categorySelect, '1');
    const subSelect = screen
      .getAllByRole('combobox')
      .find((el) => within(el).queryByRole('option', { name: 'VGA/HDMI' })) as HTMLSelectElement;
    await userEvent.selectOptions(subSelect, '10');
    expect(subSelect.value).toBe('10');

    await userEvent.selectOptions(categorySelect, '2');

    expect(categorySelect.value).toBe('2');
    expect(subSelect.value).toBe('');
  });
});

function renderWithPhotos(photoUrls: string[], onSave: (d: Record<string, unknown>) => void = () => {}) {
  render(
    <ItemForm
      item={{ id: 1, nom: 'Sono', photoUrls }}
      categories={categories}
      localisations={localisations}
      onSave={onSave}
      isSaving={false}
      onCancel={() => {}}
    />
  );
}

describe('ItemForm photo gallery', () => {
  it('shows every existing photo of the item', () => {
    renderWithPhotos(['/uploads/photos/a.jpg', '/uploads/photos/b.jpg']);

    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('counts the photos against the limit', () => {
    renderWithPhotos(['/uploads/photos/a.jpg']);

    expect(screen.getByText('1/6')).toBeTruthy();
  });

  it('reports a removed photo without touching the server', async () => {
    const onSave = vi.fn();
    renderWithPhotos(['/uploads/photos/a.jpg'], onSave);

    await userEvent.click(screen.getByLabelText('Retirer la photo 1'));
    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }));

    expect(onSave.mock.calls[0][0]._removedPhotoUrls).toEqual(['/uploads/photos/a.jpg']);
  });

  it('stops offering the add button once the item is full', () => {
    renderWithPhotos([
      '/uploads/photos/a.jpg', '/uploads/photos/b.jpg', '/uploads/photos/c.jpg',
      '/uploads/photos/d.jpg', '/uploads/photos/e.jpg', '/uploads/photos/f.jpg',
    ]);

    expect(screen.getByRole('button', { name: /Ajouter des photos/ })).toHaveProperty('disabled', true);
  });
});
