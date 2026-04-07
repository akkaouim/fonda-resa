import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  createUserSchema,
  createItemSchema,
  createReservationSchema,
  createSortieSchema,
  createConsommationSchema,
} from '../shared/index.js';

describe('loginSchema', () => {
  it('validates correct login data', () => {
    const result = loginSchema.safeParse({ email: 'test@esviere.fr', password: 'password123' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'password123' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'test@esviere.fr', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('createUserSchema', () => {
  it('validates correct user data', () => {
    const result = createUserSchema.safeParse({
      nom: 'Dupont', prenom: 'Marie', email: 'marie@esviere.fr', password: 'password123',
    });
    expect(result.success).toBe(true);
    expect(result.data?.role).toBe('membre'); // default
  });

  it('rejects short password', () => {
    const result = createUserSchema.safeParse({
      nom: 'Dupont', prenom: 'Marie', email: 'marie@esviere.fr', password: '123',
    });
    expect(result.success).toBe(false);
  });
});

describe('createItemSchema', () => {
  it('validates item with defaults', () => {
    const result = createItemSchema.safeParse({ nom: 'Cable XLR 10m', quantiteStock: 13 });
    expect(result.success).toBe(true);
    expect(result.data?.etat).toBe('bon');
    expect(result.data?.typeItem).toBe('equipement');
    expect(result.data?.perimetreUtilisation).toBe('libre');
  });

  it('rejects negative quantity', () => {
    const result = createItemSchema.safeParse({ nom: 'Test', quantiteStock: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createItemSchema.safeParse({ nom: '', quantiteStock: 1 });
    expect(result.success).toBe(false);
  });
});

describe('createReservationSchema', () => {
  const validResa = {
    dateDebut: '2026-05-15T00:00:00.000Z',
    dateFin: '2026-05-17T23:59:59.000Z',
    motif: 'Weekend formation',
    lieuEvenement: 'Grande salle',
    estHorsSite: false,
    lignes: [{ itemId: 1, quantiteDemandee: 4 }],
  };

  it('validates correct reservation', () => {
    const result = createReservationSchema.safeParse(validResa);
    expect(result.success).toBe(true);
  });

  it('rejects empty lines', () => {
    const result = createReservationSchema.safeParse({ ...validResa, lignes: [] });
    expect(result.success).toBe(false);
  });

  it('rejects end date before start date', () => {
    const result = createReservationSchema.safeParse({
      ...validResa,
      dateDebut: '2026-05-17T00:00:00.000Z',
      dateFin: '2026-05-15T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero quantity', () => {
    const result = createReservationSchema.safeParse({
      ...validResa,
      lignes: [{ itemId: 1, quantiteDemandee: 0 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('createSortieSchema', () => {
  it('validates sortie with lines', () => {
    const result = createSortieSchema.safeParse({
      lignes: [{ itemId: 1, quantite: 4, etatConstate: 'bon' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty lines', () => {
    const result = createSortieSchema.safeParse({ lignes: [] });
    expect(result.success).toBe(false);
  });
});

describe('createConsommationSchema', () => {
  it('validates consommation', () => {
    const result = createConsommationSchema.safeParse({ itemId: 1, quantite: 5 });
    expect(result.success).toBe(true);
  });

  it('rejects zero quantity', () => {
    const result = createConsommationSchema.safeParse({ itemId: 1, quantite: 0 });
    expect(result.success).toBe(false);
  });
});
