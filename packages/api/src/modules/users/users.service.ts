import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
import { hashPassword } from '../auth/auth.service.js';
import { sendAccountCreated, sendPasswordResetByAdmin } from '../../services/email.service.js';
import { logAudit } from '../../services/audit.service.js';
import type { Role } from '@prisma/client';

const USER_SELECT = {
  id: true,
  nom: true,
  prenom: true,
  email: true,
  role: true,
  actif: true,
  createdAt: true,
  updatedAt: true,
};

export async function listUsers() {
  return prisma.utilisateur.findMany({
    select: USER_SELECT,
    orderBy: [{ role: 'asc' }, { nom: 'asc' }],
  });
}

export async function getUserById(id: number) {
  const user = await prisma.utilisateur.findUnique({
    where: { id },
    select: USER_SELECT,
  });
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable');
  }
  return user;
}

export async function createUser(
  data: { nom: string; prenom: string; email: string; password: string; role: Role },
  adminId: number
) {
  const existing = await prisma.utilisateur.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError(409, 'EMAIL_EXISTS', 'Un compte avec cet email existe deja');
  }

  const hashedPassword = await hashPassword(data.password);
  const user = await prisma.utilisateur.create({
    data: {
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      motDePasse: hashedPassword,
      role: data.role,
    },
    select: USER_SELECT,
  });

  await logAudit({
    utilisateurId: adminId,
    action: 'user.create',
    entiteType: 'Utilisateur',
    entiteId: user.id,
    details: { email: data.email, role: data.role },
  });

  // Send welcome email with temp password (best effort)
  sendAccountCreated(data.email, data.prenom, data.password).catch(() => {});

  return user;
}

export async function updateUser(
  id: number,
  data: { nom?: string; prenom?: string; email?: string; role?: Role; actif?: boolean },
  adminId: number
) {
  const user = await prisma.utilisateur.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable');
  }

  if (data.email && data.email !== user.email) {
    const existing = await prisma.utilisateur.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError(409, 'EMAIL_EXISTS', 'Un compte avec cet email existe deja');
    }
  }

  const updated = await prisma.utilisateur.update({
    where: { id },
    data,
    select: USER_SELECT,
  });

  await logAudit({
    utilisateurId: adminId,
    action: 'user.update',
    entiteType: 'Utilisateur',
    entiteId: id,
    details: data,
  });

  return updated;
}

export async function resetUserPassword(id: number, password: string, adminId: number) {
  const user = await prisma.utilisateur.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable');
  }

  const hashedPassword = await hashPassword(password);
  const updated = await prisma.utilisateur.update({
    where: { id },
    data: { motDePasse: hashedPassword },
    select: USER_SELECT,
  });

  await logAudit({
    utilisateurId: adminId,
    action: 'user.reset_password',
    entiteType: 'Utilisateur',
    entiteId: id,
  });

  // Notify the user of their new temporary password (best effort)
  sendPasswordResetByAdmin(user.email, user.prenom, password).catch(() => {});

  return updated;
}

export async function deactivateUser(id: number, adminId: number) {
  const user = await prisma.utilisateur.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable');
  }
  if (id === adminId) {
    throw new AppError(400, 'SELF_DEACTIVATE', 'Vous ne pouvez pas desactiver votre propre compte');
  }

  const updated = await prisma.utilisateur.update({
    where: { id },
    data: { actif: false },
    select: USER_SELECT,
  });

  await logAudit({
    utilisateurId: adminId,
    action: 'user.deactivate',
    entiteType: 'Utilisateur',
    entiteId: id,
  });

  return updated;
}
