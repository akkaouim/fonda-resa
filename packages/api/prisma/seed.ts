import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default admin account
  const adminPassword = await bcrypt.hash('admin1234', 12);
  const admin = await prisma.utilisateur.upsert({
    where: { email: 'admin@esviere.fr' },
    update: {},
    create: {
      nom: 'Admin',
      prenom: 'Esviere',
      email: 'admin@esviere.fr',
      motDePasse: adminPassword,
      role: 'admin',
      actif: true,
    },
  });
  console.log(`Admin account: ${admin.email} (password: admin1234)`);

  // Create a demo member account
  const membrePassword = await bcrypt.hash('membre1234', 12);
  const membre = await prisma.utilisateur.upsert({
    where: { email: 'membre@esviere.fr' },
    update: {},
    create: {
      nom: 'Dupont',
      prenom: 'Marie',
      email: 'membre@esviere.fr',
      motDePasse: membrePassword,
      role: 'membre',
      actif: true,
    },
  });
  console.log(`Member account: ${membre.email} (password: membre1234)`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
