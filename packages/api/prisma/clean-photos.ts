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
  const items = await prisma.item.findMany({ where: { NOT: { photoUrls: { isEmpty: true } } } });
  let cleared = 0;
  for (const item of items) {
    const kept = item.photoUrls.filter((url) => {
      const filename = url.replace('/uploads/photos/', '');
      return fs.existsSync(path.join(uploadDir, filename));
    });
    if (kept.length !== item.photoUrls.length) {
      await prisma.item.update({ where: { id: item.id }, data: { photoUrls: kept } });
      console.log(`Cleared ${item.photoUrls.length - kept.length}: ${item.nom}`);
      cleared += item.photoUrls.length - kept.length;
    } else {
      console.log(`OK: ${item.nom}`);
    }
  }
  console.log(`\n${cleared} photo URLs cleared`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
