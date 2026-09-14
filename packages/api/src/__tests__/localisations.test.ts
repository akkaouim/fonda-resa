import { describe, it, expect } from 'vitest';
import { checkLocalisationDeletable, normaliseDescription } from '../modules/localisations/localisations.service.js';

describe('checkLocalisationDeletable', () => {
  it('allows deleting a localisation that holds no items', () => {
    expect(checkLocalisationDeletable({ nom: 'Sacristie' }, 0).ok).toBe(true);
  });

  it('blocks deleting a localisation that still holds items', () => {
    const result = checkLocalisationDeletable({ nom: 'Sacristie' }, 7);
    expect(result.ok).toBe(false);
  });

  it('names the localisation and the item count in the refusal', () => {
    const result = checkLocalisationDeletable({ nom: 'Sacristie' }, 7);
    expect(result.message).toContain('Sacristie');
    expect(result.message).toContain('7');
  });

  it('uses singular wording for a single item', () => {
    const result = checkLocalisationDeletable({ nom: 'Regie chapelle' }, 1);
    expect(result.message).toContain('1 materiel y est');
  });

  it('uses plural wording beyond one item', () => {
    const result = checkLocalisationDeletable({ nom: 'Grande salle' }, 3);
    expect(result.message).toContain('3 materiels y sont');
  });
});

describe('normaliseDescription', () => {
  it('keeps a real description', () => {
    expect(normaliseDescription('Sous l\'escalier')).toBe('Sous l\'escalier');
  });

  it('trims surrounding whitespace', () => {
    expect(normaliseDescription('  Placard du fond  ')).toBe('Placard du fond');
  });

  it('clears an omitted description so an update can empty it', () => {
    expect(normaliseDescription(undefined)).toBeNull();
  });

  it('clears an emptied description', () => {
    expect(normaliseDescription('')).toBeNull();
  });

  it('clears a whitespace-only description', () => {
    expect(normaliseDescription('   ')).toBeNull();
  });
});
