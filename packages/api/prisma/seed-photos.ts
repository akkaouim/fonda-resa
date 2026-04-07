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
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Map item names to search-friendly image URLs (direct links to product images)
// Using manufacturer/retailer images for common audio equipment
const IMAGE_MAP: Record<string, string> = {
  // Sono
  'Enceinte JBL EON615': 'https://images.musicstore.de/images/1280/jbl-eon-615-_1_PAH0014025-000.jpg',
  'Enceinte JBL EON610': 'https://images.musicstore.de/images/1280/jbl-eon-610-_1_PAH0013466-000.jpg',
  'Sub JBL EON618S': 'https://images.musicstore.de/images/1280/jbl-eon-618s-_1_PAH0014027-000.jpg',
  'Retour de scene Yamaha': 'https://usa.yamaha.com/files/A12M_main_0f6e73e31d6595cdc2115ae4e7c7e92a.jpg',

  // Tables de mixage
  'Table de mixage Yamaha MG16': 'https://usa.yamaha.com/files/MG16_main_0aef148c878d5a8f73cdf67893a22e1e.jpg',
  'Mixette Soundcraft Ui12': 'https://images.musicstore.de/images/1280/soundcraft-ui12-_1_PAH0014632-000.jpg',
  'Table de mixage Allen & Heath': 'https://images.musicstore.de/images/1280/allen-heath-zed-14-_1_PAH0006805-000.jpg',

  // Micros
  'Micro Shure SM58': 'https://pubs.shure.com/guide/sm58/content/img/sm58.png',
  'Micro Shure SM57': 'https://pubs.shure.com/guide/sm57/content/img/sm57.png',
  'Micro serre-tete AKG': 'https://images.musicstore.de/images/1280/akg-c-520-_1_PAH0005147-000.jpg',
  'Micro statique AKG C214': 'https://images.musicstore.de/images/1280/akg-c-214-_1_PAH0005144-000.jpg',

  // DI
  'DI Box BSS AR-133': 'https://images.musicstore.de/images/1280/bss-audio-ar-133-_1_PAH0003380-000.jpg',

  // Cables
  'Cable XLR 3m': 'https://images.musicstore.de/images/1280/cordial-cfm-3-fm-_1_PAH0011178-000.jpg',
  'Cable XLR 5m': 'https://images.musicstore.de/images/1280/cordial-cfm-5-fm-_1_PAH0011179-000.jpg',
  'Cable XLR 10m': 'https://images.musicstore.de/images/1280/cordial-cfm-10-fm-_1_PAH0011180-000.jpg',
  'Cable XLR 20m': 'https://images.musicstore.de/images/1280/cordial-cfm-20-fm-_1_PAH0011181-000.jpg',
  'Cable Jack 6.35 mono 3m': 'https://images.musicstore.de/images/1280/cordial-cfi-3-pp-_1_PAH0011041-000.jpg',
  'Cable Jack 6.35 mono 5m': 'https://images.musicstore.de/images/1280/cordial-cfi-6-pp-_1_PAH0011043-000.jpg',
  'Cable SpeakOn 5m': 'https://images.musicstore.de/images/1280/cordial-cfn-5-ll-_1_PAH0011090-000.jpg',
  'Cable SpeakOn 10m': 'https://images.musicstore.de/images/1280/cordial-cfn-10-ll-_1_PAH0011091-000.jpg',
  'Cable HDMI 5m': 'https://m.media-amazon.com/images/I/51TG3Y7K1jL._AC_SL1000_.jpg',
  'Cable VGA 10m': 'https://m.media-amazon.com/images/I/61HmhXzNfHL._AC_SL1500_.jpg',
  'Adaptateur HDMI-VGA': 'https://m.media-amazon.com/images/I/61ixPSaF-jL._AC_SL1500_.jpg',

  // Pieds
  'Pied de micro perche K&M': 'https://images.musicstore.de/images/1280/k-m-21060-_1_PAH0006316-000.jpg',
  'Pied de micro droit K&M': 'https://images.musicstore.de/images/1280/k-m-26010-_1_PAH0006317-000.jpg',
  'Pupitre': 'https://images.musicstore.de/images/1280/k-m-10065-_1_PAH0006253-000.jpg',

  // Instruments
  'Clavier workstation Yamaha PSR': 'https://usa.yamaha.com/files/PSR-E373_main_ef413c558e5aa1c43f9f1f2e254f5a5d.jpg',
  'Piano numerique Roland': 'https://images.musicstore.de/images/1280/roland-fp-30x-bk-_1_PIH0048989-000.jpg',
  'Guitare acoustique': 'https://images.musicstore.de/images/1280/yamaha-f310-_1_GIT0002187-000.jpg',
  'Basse electrique': 'https://images.musicstore.de/images/1280/squier-affinity-jazz-bass-3ts-_1_GIT0044274-000.jpg',
  'Cajon': 'https://images.musicstore.de/images/1280/schlagwerk-cp404-blk-2-in-one-cajon-_1_DRU0013936-000.jpg',
  'Djembe': 'https://images.musicstore.de/images/1280/meinl-hdj500vwb-_1_DRU0012400-000.jpg',

  // Eclairage
  'Projecteur LED PAR56': 'https://images.musicstore.de/images/1280/stairville-led-par-56-black-rgb-_1_LTH0006325-000.jpg',
  'Pied eclairage T-bar': 'https://images.musicstore.de/images/1280/stairville-lst-310-pro-lighting-stand-_1_LTH0004632-000.jpg',
  'Controleur DMX': 'https://images.musicstore.de/images/1280/stairville-dmx-master-3-fx-_1_LTH0005912-000.jpg',

  // Multiprises
  'Multiprise 5m': 'https://m.media-amazon.com/images/I/61M-sI3RI1L._AC_SL1500_.jpg',
  'Multiprise 10m': 'https://m.media-amazon.com/images/I/61M-sI3RI1L._AC_SL1500_.jpg',
  'Bloc adaptateur secteur': 'https://m.media-amazon.com/images/I/61t5KRDvYwL._AC_SL1500_.jpg',

  // Consommables
  'Piles AA (lot de 4)': 'https://m.media-amazon.com/images/I/71bSIKA-URL._AC_SL1500_.jpg',
  'Piles 9V': 'https://m.media-amazon.com/images/I/718V5VMXP4L._AC_SL1500_.jpg',
  'Bonnette micro mousse': 'https://m.media-amazon.com/images/I/61VkzMIGi7L._AC_SL1500_.jpg',
  'Gaffer noir 50m': 'https://m.media-amazon.com/images/I/71cZ-yJZKaL._AC_SL1500_.jpg',
};

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const request = proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      // Follow redirects
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', reject);
    });
    request.on('error', reject);
    request.setTimeout(10000, () => { request.destroy(); reject(new Error('Timeout')); });
  });
}

async function main() {
  console.log('Downloading item photos...');
  const items = await prisma.item.findMany({ where: { actif: true } });

  let downloaded = 0;
  let failed = 0;

  for (const item of items) {
    const url = IMAGE_MAP[item.nom];
    if (!url) {
      console.log(`  [skip] ${item.nom} — no URL mapped`);
      continue;
    }

    const ext = url.match(/\.(jpg|jpeg|png|webp)/i)?.[0] || '.jpg';
    const filename = `item-${item.id}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const photoUrl = `/uploads/photos/${filename}`;

    try {
      if (!fs.existsSync(filepath)) {
        await downloadFile(url, filepath);
      }
      await prisma.item.update({ where: { id: item.id }, data: { photoUrl } });
      downloaded++;
      console.log(`  [ok] ${item.nom}`);
    } catch (err: any) {
      failed++;
      console.log(`  [fail] ${item.nom}: ${err.message}`);
    }
  }

  console.log(`\nDone: ${downloaded} downloaded, ${failed} failed, ${items.length - downloaded - failed} skipped`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
