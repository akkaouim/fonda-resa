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

  // ─── Users ─────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin1234', 12);
  const admin = await prisma.utilisateur.upsert({
    where: { email: 'admin@esviere.fr' },
    update: {},
    create: {
      nom: 'Admin', prenom: 'Esviere', email: 'admin@esviere.fr',
      motDePasse: adminPassword, role: 'admin', actif: true,
    },
  });
  console.log(`Admin: ${admin.email} / admin1234`);

  const membrePassword = await bcrypt.hash('membre1234', 12);
  const membre = await prisma.utilisateur.upsert({
    where: { email: 'membre@esviere.fr' },
    update: {},
    create: {
      nom: 'Dupont', prenom: 'Marie', email: 'membre@esviere.fr',
      motDePasse: membrePassword, role: 'membre', actif: true,
    },
  });
  console.log(`Membre: ${membre.email} / membre1234`);

  // ─── Locations ─────────────────────────────────────
  const locs = [
    { nom: 'Salle Robert Schutz', estSurSite: true, description: 'Stockage principal materiel sono' },
    { nom: 'Regie chapelle', estSurSite: true, description: 'Regie audiovisuelle de la chapelle' },
    { nom: 'Salle La Source', estSurSite: true, description: 'Salle de cours IFF Europe' },
    { nom: 'Grande salle', estSurSite: true, description: 'Grande salle polyvalente' },
    { nom: 'Bureau Daniel', estSurSite: true, description: 'Bureau administratif' },
    { nom: 'Sacristie', estSurSite: true, description: 'Sacristie de la chapelle' },
  ];
  const locMap: Record<string, number> = {};
  for (const l of locs) {
    const loc = await prisma.localisation.upsert({ where: { nom: l.nom }, update: {}, create: l });
    locMap[l.nom] = loc.id;
  }
  console.log(`${locs.length} localisations creees`);

  // ─── Categories ────────────────────────────────────
  const cats = [
    { nom: 'Sono', sous: ['Retours', 'Monitoring', 'Amplis', 'Enceintes'] },
    { nom: 'Micros', sous: ['Dynamiques', 'Statiques', 'Sans fil'] },
    { nom: 'Direct Box', sous: [] },
    { nom: 'Tables de mixage', sous: [] },
    { nom: 'Cables', sous: ['XLR', 'Jack', 'SpeakOn', 'VGA/HDMI', 'RCA', 'Adaptateurs'] },
    { nom: 'Pieds de micro', sous: ['Perche', 'Droit'] },
    { nom: 'Pupitres', sous: [] },
    { nom: 'Instruments', sous: ['Claviers', 'Guitares', 'Basse', 'Batterie', 'Percussions'] },
    { nom: 'Eclairage', sous: ['Projecteurs', 'Pieds eclairage', 'Controleurs'] },
    { nom: 'Blocs adaptateurs', sous: [] },
    { nom: 'Multiprises', sous: [] },
    { nom: 'Consommables', sous: ['Piles', 'Bonnettes', 'Gaffer'] },
    { nom: 'Divers', sous: [] },
  ];

  const catMap: Record<string, number> = {};
  const sousCatMap: Record<string, number> = {};
  for (const c of cats) {
    const cat = await prisma.categorie.upsert({ where: { nom: c.nom }, update: {}, create: { nom: c.nom } });
    catMap[c.nom] = cat.id;
    for (const s of c.sous) {
      const sous = await prisma.sousCategorie.upsert({
        where: { categorieId_nom: { categorieId: cat.id, nom: s } },
        update: {},
        create: { nom: s, categorieId: cat.id },
      });
      sousCatMap[`${c.nom}/${s}`] = sous.id;
    }
  }
  console.log(`${cats.length} categories creees`);

  // ─── Items ─────────────────────────────────────────
  const items = [
    // Sono
    { nom: 'Enceinte JBL EON615', categorieId: catMap['Sono'], quantiteStock: 2, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const, marquage: 'Etiquette bleue' },
    { nom: 'Enceinte JBL EON610', categorieId: catMap['Sono'], quantiteStock: 2, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },
    { nom: 'Sub JBL EON618S', categorieId: catMap['Sono'], quantiteStock: 1, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },
    { nom: 'Retour de scene Yamaha', categorieId: catMap['Sono'], sousCategorieId: sousCatMap['Sono/Retours'], quantiteStock: 4, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },

    // Tables de mixage
    { nom: 'Table de mixage Yamaha MG16', categorieId: catMap['Tables de mixage'], quantiteStock: 1, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const, notes: 'Table principale' },
    { nom: 'Mixette Soundcraft Ui12', categorieId: catMap['Tables de mixage'], quantiteStock: 1, localisationId: locMap['Salle La Source'], etat: 'bon' as const, perimetreUtilisation: 'sur_place' as const, notes: 'Ne quitte pas La Source' },
    { nom: 'Table de mixage Allen & Heath', categorieId: catMap['Tables de mixage'], quantiteStock: 1, localisationId: locMap['Regie chapelle'], etat: 'bon' as const, perimetreUtilisation: 'sur_place' as const },

    // Micros
    { nom: 'Micro Shure SM58', categorieId: catMap['Micros'], sousCategorieId: sousCatMap['Micros/Dynamiques'], quantiteStock: 6, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },
    { nom: 'Micro Shure SM57', categorieId: catMap['Micros'], sousCategorieId: sousCatMap['Micros/Dynamiques'], quantiteStock: 3, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },
    { nom: 'Micro serre-tete AKG', categorieId: catMap['Micros'], sousCategorieId: sousCatMap['Micros/Sans fil'], quantiteStock: 2, localisationId: locMap['Salle Robert Schutz'], etat: 'usage' as const, commentaireEtat: '1 sur 2 avec bouton un peu dur' },
    { nom: 'Micro statique AKG C214', categorieId: catMap['Micros'], sousCategorieId: sousCatMap['Micros/Statiques'], quantiteStock: 2, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },

    // DI Box
    { nom: 'DI Box BSS AR-133', categorieId: catMap['Direct Box'], quantiteStock: 4, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },

    // Cables XLR
    { nom: 'Cable XLR 3m', categorieId: catMap['Cables'], sousCategorieId: sousCatMap['Cables/XLR'], quantiteStock: 8, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const, marquage: 'Bande rouge' },
    { nom: 'Cable XLR 5m', categorieId: catMap['Cables'], sousCategorieId: sousCatMap['Cables/XLR'], quantiteStock: 10, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const, marquage: 'Bande bleue' },
    { nom: 'Cable XLR 10m', categorieId: catMap['Cables'], sousCategorieId: sousCatMap['Cables/XLR'], quantiteStock: 13, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const, marquage: 'Bande verte' },
    { nom: 'Cable XLR 20m', categorieId: catMap['Cables'], sousCategorieId: sousCatMap['Cables/XLR'], quantiteStock: 4, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const, marquage: 'Bande jaune' },

    // Cables Jack
    { nom: 'Cable Jack 6.35 mono 3m', categorieId: catMap['Cables'], sousCategorieId: sousCatMap['Cables/Jack'], quantiteStock: 6, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },
    { nom: 'Cable Jack 6.35 mono 5m', categorieId: catMap['Cables'], sousCategorieId: sousCatMap['Cables/Jack'], quantiteStock: 4, localisationId: locMap['Salle Robert Schutz'], etat: 'usage' as const, commentaireEtat: '1 cable avec faux contact' },

    // Cables SpeakOn
    { nom: 'Cable SpeakOn 5m', categorieId: catMap['Cables'], sousCategorieId: sousCatMap['Cables/SpeakOn'], quantiteStock: 4, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },
    { nom: 'Cable SpeakOn 10m', categorieId: catMap['Cables'], sousCategorieId: sousCatMap['Cables/SpeakOn'], quantiteStock: 2, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },

    // HDMI/VGA
    { nom: 'Cable HDMI 5m', categorieId: catMap['Cables'], sousCategorieId: sousCatMap['Cables/VGA/HDMI'], quantiteStock: 3, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },
    { nom: 'Cable VGA 10m', categorieId: catMap['Cables'], sousCategorieId: sousCatMap['Cables/VGA/HDMI'], quantiteStock: 2, localisationId: locMap['Salle Robert Schutz'], etat: 'usage' as const },
    { nom: 'Adaptateur HDMI-VGA', categorieId: catMap['Cables'], sousCategorieId: sousCatMap['Cables/Adaptateurs'], quantiteStock: 3, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },

    // Pieds
    { nom: 'Pied de micro perche K&M', categorieId: catMap['Pieds de micro'], sousCategorieId: sousCatMap['Pieds de micro/Perche'], quantiteStock: 8, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const, notes: '2 avec fermeture un peu dure' },
    { nom: 'Pied de micro droit K&M', categorieId: catMap['Pieds de micro'], sousCategorieId: sousCatMap['Pieds de micro/Droit'], quantiteStock: 4, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },
    { nom: 'Pupitre', categorieId: catMap['Pupitres'], quantiteStock: 6, localisationId: locMap['Grande salle'], etat: 'bon' as const, perimetreUtilisation: 'sur_le_site' as const },

    // Instruments
    { nom: 'Clavier workstation Yamaha PSR', categorieId: catMap['Instruments'], sousCategorieId: sousCatMap['Instruments/Claviers'], quantiteStock: 1, localisationId: locMap['Regie chapelle'], etat: 'bon' as const, perimetreUtilisation: 'sur_place' as const },
    { nom: 'Piano numerique Roland', categorieId: catMap['Instruments'], sousCategorieId: sousCatMap['Instruments/Claviers'], quantiteStock: 1, localisationId: locMap['Grande salle'], etat: 'bon' as const, perimetreUtilisation: 'sur_le_site' as const },
    { nom: 'Guitare acoustique', categorieId: catMap['Instruments'], sousCategorieId: sousCatMap['Instruments/Guitares'], quantiteStock: 2, localisationId: locMap['Salle Robert Schutz'], etat: 'usage' as const, commentaireEtat: '1 guitare: corde cassee' },
    { nom: 'Basse electrique', categorieId: catMap['Instruments'], sousCategorieId: sousCatMap['Instruments/Basse'], quantiteStock: 1, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },
    { nom: 'Cajon', categorieId: catMap['Instruments'], sousCategorieId: sousCatMap['Instruments/Percussions'], quantiteStock: 2, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },
    { nom: 'Djembe', categorieId: catMap['Instruments'], sousCategorieId: sousCatMap['Instruments/Percussions'], quantiteStock: 3, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },

    // Eclairage
    { nom: 'Projecteur LED PAR56', categorieId: catMap['Eclairage'], sousCategorieId: sousCatMap['Eclairage/Projecteurs'], quantiteStock: 8, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },
    { nom: 'Pied eclairage T-bar', categorieId: catMap['Eclairage'], sousCategorieId: sousCatMap['Eclairage/Pieds eclairage'], quantiteStock: 4, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },
    { nom: 'Controleur DMX', categorieId: catMap['Eclairage'], sousCategorieId: sousCatMap['Eclairage/Controleurs'], quantiteStock: 1, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },

    // Multiprises et blocs
    { nom: 'Multiprise 5m', categorieId: catMap['Multiprises'], quantiteStock: 6, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },
    { nom: 'Multiprise 10m', categorieId: catMap['Multiprises'], quantiteStock: 3, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },
    { nom: 'Bloc adaptateur secteur', categorieId: catMap['Blocs adaptateurs'], quantiteStock: 4, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const },

    // Consommables
    { nom: 'Piles AA (lot de 4)', categorieId: catMap['Consommables'], sousCategorieId: sousCatMap['Consommables/Piles'], quantiteStock: 20, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const, typeItem: 'consommable' as const },
    { nom: 'Piles 9V', categorieId: catMap['Consommables'], sousCategorieId: sousCatMap['Consommables/Piles'], quantiteStock: 8, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const, typeItem: 'consommable' as const },
    { nom: 'Bonnette micro mousse', categorieId: catMap['Consommables'], sousCategorieId: sousCatMap['Consommables/Bonnettes'], quantiteStock: 10, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const, typeItem: 'consommable' as const },
    { nom: 'Gaffer noir 50m', categorieId: catMap['Consommables'], sousCategorieId: sousCatMap['Consommables/Gaffer'], quantiteStock: 3, localisationId: locMap['Salle Robert Schutz'], etat: 'bon' as const, typeItem: 'consommable' as const },
  ];

  // Only seed items if table is empty (avoid duplicates on re-run)
  const existingCount = await prisma.item.count();
  if (existingCount === 0) {
    for (const item of items) {
      await prisma.item.create({ data: item });
    }
    console.log(`${items.length} items crees`);
  } else {
    console.log(`${existingCount} items deja presents, seed items ignore`);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
