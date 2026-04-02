import { z } from 'zod';
import { Role } from '../enums.js';

export const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

export const createUserSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis').max(100),
  prenom: z.string().min(1, 'Le prenom est requis').max(100),
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caracteres'),
  role: z.nativeEnum(Role).default(Role.MEMBRE),
});

export const updateUserSchema = z.object({
  nom: z.string().min(1).max(100).optional(),
  prenom: z.string().min(1).max(100).optional(),
  email: z.string().email('Adresse email invalide').optional(),
  role: z.nativeEnum(Role).optional(),
  actif: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Adresse email invalide'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caracteres'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caracteres'),
});
