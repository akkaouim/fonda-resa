import { Request, Response } from 'express';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../../shared/index.js';
import * as authService from './auth.service.js';
import { env } from '../../config/env.js';

const REFRESH_COOKIE = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  const { accessToken, refreshToken, user } = await authService.login(email, password);

  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
  res.json({ success: true, data: { accessToken, user } });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'NO_REFRESH_TOKEN', message: 'Token de rafraichissement manquant' },
    });
    return;
  }

  const { accessToken } = await authService.refreshAccessToken(token);
  res.json({ success: true, data: { accessToken } });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  res.json({ success: true, data: { message: 'Deconnexion reussie' } });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = forgotPasswordSchema.parse(req.body);
  await authService.forgotPassword(email);
  // Always return success to prevent email enumeration
  res.json({ success: true, data: { message: 'Si cette adresse existe, un email a ete envoye' } });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(token, password);
  res.json({ success: true, data: { message: 'Mot de passe reinitialise avec succes' } });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await authService.changePassword(req.user!.sub, currentPassword, newPassword);
  res.json({ success: true, data: { message: 'Mot de passe modifie avec succes' } });
}

export async function me(req: Request, res: Response) {
  const { prisma } = await import('../../config/database.js');
  const user = await prisma.utilisateur.findUnique({
    where: { id: req.user!.sub },
    select: {
      id: true, nom: true, prenom: true, email: true,
      role: true, actif: true, createdAt: true,
    },
  });
  if (!user) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable' },
    });
    return;
  }
  res.json({ success: true, data: user });
}
