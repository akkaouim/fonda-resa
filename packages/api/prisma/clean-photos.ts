import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const uploadDir = path.resolve(__dirname, '../../../uploads/photos');
  const items = await prisma.item.findMany({ where: { photoUrl: { not: null } } });
  let cleared = 0;
  for (const item of items) {
    const filename = item.photoUrl!.replace('/uploads/photos/', '');
    const filepath = path.join(uploadDir, filename);
    if (!fs.existsSync(filepath)) {
      await prisma.item.update({ where: { id: item.id }, data: { photoUrl: null } });
      console.log(`Cleared: ${item.nom}`);
      cleared++;
    } else {
      console.log(`OK: ${item.nom} (${filepath})`);
    }
  }
  console.log(`\n${cleared} photo URLs cleared`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
