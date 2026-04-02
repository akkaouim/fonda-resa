import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error-handler.js';
import { sendPasswordReset } from '../../services/email.service.js';
import type { JwtPayload } from '../../middleware/auth.js';

const SALT_ROUNDS = 12;

export async function login(email: string, password: string) {
  const user = await prisma.utilisateur.findUnique({ where: { email } });
  if (!user || !user.actif) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect');
  }

  const valid = await bcrypt.compare(password, user.motDePasse);
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect');
  }

  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id, user.role);

  const { motDePasse: _, resetToken: __, resetTokenExpiry: ___, ...publicUser } = user;
  return { accessToken, refreshToken, user: publicUser };
}

export async function refreshAccessToken(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as unknown as JwtPayload;

    // Verify user still exists and is active
    const user = await prisma.utilisateur.findUnique({ where: { id: payload.sub } });
    if (!user || !user.actif) {
      throw new AppError(401, 'INVALID_TOKEN', 'Utilisateur introuvable ou desactive');
    }

    const accessToken = generateAccessToken(user.id, user.role);
    return { accessToken };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(401, 'INVALID_TOKEN', 'Token de rafraichissement invalide ou expire');
  }
}

export async function forgotPassword(email: string) {
  const user = await prisma.utilisateur.findUnique({ where: { email } });
  // Always return success to prevent email enumeration
  if (!user || !user.actif) return;

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.utilisateur.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  });

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendPasswordReset(user.email, resetUrl);
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await prisma.utilisateur.findUnique({ where: { resetToken: token } });
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    throw new AppError(400, 'INVALID_TOKEN', 'Lien de reinitialisation invalide ou expire');
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.utilisateur.update({
    where: { id: user.id },
    data: {
      motDePasse: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  const user = await prisma.utilisateur.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable');
  }

  const valid = await bcrypt.compare(currentPassword, user.motDePasse);
  if (!valid) {
    throw new AppError(400, 'INVALID_PASSWORD', 'Mot de passe actuel incorrect');
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.utilisateur.update({
    where: { id: userId },
    data: { motDePasse: hashedPassword },
  });
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function generateAccessToken(userId: number, role: string) {
  return jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'],
  });
}

function generateRefreshToken(userId: number, role: string) {
  return jwt.sign({ sub: userId, role }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as jwt.SignOptions['expiresIn'],
  });
}
