import { prisma } from '../config/database.js';

interface AuditEntry {
  utilisateurId: number;
  action: string;
  entiteType: string;
  entiteId?: number;
  details?: Record<string, unknown>;
}

export async function logAudit(entry: AuditEntry) {
  await prisma.auditLog.create({
    data: {
      utilisateurId: entry.utilisateurId,
      action: entry.action,
      entiteType: entry.entiteType,
      entiteId: entry.entiteId,
      details: entry.details ? JSON.parse(JSON.stringify(entry.details)) : undefined,
    },
  });
}
