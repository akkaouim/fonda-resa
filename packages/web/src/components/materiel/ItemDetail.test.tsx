import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemDetail from './ItemDetail';

const ITEM = {
  id: 1,
  nom: 'Sono portable',
  photoUrls: ['/uploads/photos/a.jpg', '/uploads/photos/b.jpg', '/uploads/photos/c.jpg'],
  etat: 'bon',
  typeItem: 'equipement',
  quantiteStock: 1,
  perimetreUtilisation: 'libre',
};

afterEach(cleanup);

describe('ItemDetail photos', () => {
  it('shows the first photo as the main one', () => {
    render(<ItemDetail item={ITEM} />);

    expect(screen.getByAltText('Sono portable').getAttribute('src')).toBe('/uploads/photos/a.jpg');
  });

  it('offers the others as thumbnails', () => {
    render(<ItemDetail item={ITEM} />);

    expect(screen.getByLabelText('Voir la photo 2')).toBeTruthy();
    expect(screen.getByLabelText('Voir la photo 3')).toBeTruthy();
  });

  it('swaps the main photo when a thumbnail is clicked', async () => {
    render(<ItemDetail item={ITEM} />);

    await userEvent.click(screen.getByLabelText('Voir la photo 3'));

    expect(screen.getByAltText('Sono portable').getAttribute('src')).toBe('/uploads/photos/c.jpg');
  });

  it('shows no thumbnail strip for a single photo', () => {
    render(<ItemDetail item={{ ...ITEM, photoUrls: ['/uploads/photos/a.jpg'] }} />);

    expect(screen.queryByLabelText('Voir la photo 2')).toBeNull();
  });

  it('falls back to the placeholder when there is no photo', () => {
    render(<ItemDetail item={{ ...ITEM, photoUrls: [] }} />);

    expect(screen.queryByAltText('Sono portable')).toBeNull();
  });
});
