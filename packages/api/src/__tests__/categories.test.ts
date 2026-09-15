import { describe, it, expect } from 'vitest';
import { countLabel } from '../shared/counts.js';
import {
  checkCategorieDeletable,
  checkSousCategorieDeletable,
} from '../modules/categories/categories.service.js';

describe('countLabel', () => {
  it('keeps the singular for one', () => {
    expect(countLabel(1, 'materiel')).toBe('1 materiel');
  });

  it('adds an s beyond one', () => {
    expect(countLabel(7, 'materiel')).toBe('7 materiels');
  });

  it('pluralises a hyphenated noun', () => {
    expect(countLabel(2, 'sous-categorie')).toBe('2 sous-categories');
  });

  it('treats zero as plural, as French does not', () => {
    expect(countLabel(0, 'materiel')).toBe('0 materiel');
  });
});

describe('checkCategorieDeletable', () => {
  it('allows deleting an empty category', () => {
    expect(checkCategorieDeletable({ nom: 'Cables' }, 0, 0).ok).toBe(true);
  });

  it('refuses a category that still holds items', () => {
    const result = checkCategorieDeletable({ nom: 'Cables' }, 7, 0);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Cables');
    expect(result.message).toContain('7 materiels');
  });

  it('refuses a category that still has sub-categories', () => {
    const result = checkCategorieDeletable({ nom: 'Cables' }, 0, 2);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('2 sous-categories');
  });

  it('names both obstacles at once so the admin is not refused twice', () => {
    const result = checkCategorieDeletable({ nom: 'Cables' }, 7, 2);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('2 sous-categories');
    expect(result.message).toContain('7 materiels');
  });
});

describe('checkSousCategorieDeletable', () => {
  it('allows deleting an empty sub-category', () => {
    expect(checkSousCategorieDeletable({ nom: 'VGA/HDMI' }, 0).ok).toBe(true);
  });

  it('refuses a sub-category that still holds items', () => {
    const result = checkSousCategorieDeletable({ nom: 'VGA/HDMI' }, 3);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('VGA/HDMI');
    expect(result.message).toContain('3 materiels');
  });
});
