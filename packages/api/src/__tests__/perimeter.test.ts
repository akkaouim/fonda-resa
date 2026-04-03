import { describe, it, expect } from 'vitest';
import { validatePerimeter } from '../modules/reservations/availability.service.js';

describe('validatePerimeter', () => {
  it('allows "libre" items anywhere', () => {
    const item = { nom: 'Cable XLR', perimetreUtilisation: 'libre', localisation: null };
    expect(validatePerimeter(item, 'Grande salle', false).ok).toBe(true);
    expect(validatePerimeter(item, 'Hors site', true).ok).toBe(true);
  });

  it('allows "sur_le_site" items for on-site events', () => {
    const item = { nom: 'Pupitre', perimetreUtilisation: 'sur_le_site', localisation: { nom: 'Grande salle' } };
    expect(validatePerimeter(item, 'Chapelle', false).ok).toBe(true);
    expect(validatePerimeter(item, 'Grande salle', false).ok).toBe(true);
  });

  it('blocks "sur_le_site" items for off-site events', () => {
    const item = { nom: 'Pupitre', perimetreUtilisation: 'sur_le_site', localisation: { nom: 'Grande salle' } };
    const result = validatePerimeter(item, 'Nantes', true);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('ne peut pas quitter le site');
  });

  it('allows "sur_place" items for events in their assigned room', () => {
    const item = { nom: 'Mixette', perimetreUtilisation: 'sur_place', localisation: { nom: 'Salle La Source' } };
    expect(validatePerimeter(item, 'Salle La Source', false).ok).toBe(true);
  });

  it('blocks "sur_place" items for events in a different room', () => {
    const item = { nom: 'Mixette', perimetreUtilisation: 'sur_place', localisation: { nom: 'Salle La Source' } };
    const result = validatePerimeter(item, 'Grande salle', false);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Salle La Source');
  });

  it('blocks "sur_place" items for off-site events', () => {
    const item = { nom: 'Clavier', perimetreUtilisation: 'sur_place', localisation: { nom: 'Regie chapelle' } };
    const result = validatePerimeter(item, 'Paris', true);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Regie chapelle');
  });
});
