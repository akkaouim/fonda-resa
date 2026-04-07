import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import https from 'https';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads/photos');

const FIXES: Record<string, string> = {
  'Sub JBL EON618S': 'https://images.musicstore.de/images/1280/jbl-eon-618s-_1_PAH0014027-000.jpg',
  'Retour de scene Yamaha': 'https://images.musicstore.de/images/1280/yamaha-cbr12-_1_PAH0015361-000.jpg',
  'Table de mixage Yamaha MG16': 'https://images.musicstore.de/images/1280/yamaha-mg16xu-_1_PAH0013103-000.jpg',
  'Cable HDMI 5m': 'https://images.musicstore.de/images/1280/cordial-chdmi-5-_1_PAH0017543-000.jpg',
  'Cable VGA 10m': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Vga-cable.jpg/320px-Vga-cable.jpg',
  'Adaptateur HDMI-VGA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/HDMI-VGA-Adapter.jpg/320px-HDMI-VGA-Adapter.jpg',
  'Clavier workstation Yamaha PSR': 'https://images.musicstore.de/images/1280/yamaha-psr-e373-_1_PIH0051168-000.jpg',
  'Multiprise 5m': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Steckdosenleiste.jpg/320px-Steckdosenleiste.jpg',
  'Multiprise 10m': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Steckdosenleiste.jpg/320px-Steckdosenleiste.jpg',
  'Bloc adaptateur secteur': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Travel_universal_adaptor.jpg/320px-Travel_universal_adaptor.jpg',
  'Piles AA (lot de 4)': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Duracell_AA_battery_%28crop%29.jpg/256px-Duracell_AA_battery_%28crop%29.jpg',
  'Piles 9V': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/9v_duracell_702x532.jpg/320px-9v_duracell_702x532.jpg',
  'Bonnette micro mousse': 'https://images.musicstore.de/images/1280/on-stage-asws58-b5-_1_PAH0018234-000.jpg',
  'Gaffer noir 50m': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Gaffer_tape.jpg/320px-Gaffer_tape.jpg',
};

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const request = proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) { reject(new Error(`HTTP ${response.statusCode}`)); return; }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    });
    request.on('error', reject);
    request.setTimeout(15000, () => { request.destroy(); reject(new Error('Timeout')); });
  });
}

async function main() {
  console.log('Fixing missing photos...');
  for (const [nom, url] of Object.entries(FIXES)) {
    const item = await prisma.item.findFirst({ where: { nom } });
    if (!item) { console.log(`  [skip] ${nom} not found`); continue; }

    const ext = url.match(/\.(jpg|jpeg|png|webp)/i)?.[0] || '.jpg';
    const filename = `item-${item.id}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    try {
      await downloadFile(url, filepath);
      await prisma.item.update({ where: { id: item.id }, data: { photoUrl: `/uploads/photos/${filename}` } });
      console.log(`  [ok] ${nom}`);
    } catch (err: any) {
      console.log(`  [fail] ${nom}: ${err.message}`);
    }
  }
  console.log('Done');
}

main().catch(console.error).finally(() => prisma.$disconnect());
