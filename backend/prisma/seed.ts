// backend/prisma/seed.ts
// Jamie App - Database Seed Script

import { PrismaClient, ActivityCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo users
  const hashedPassword = await bcrypt.hash('demo123', 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'robert@jamie-app.com' },
      update: {},
      create: {
        email: 'robert@jamie-app.com',
        username: 'Robert',
        password: hashedPassword,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Robert',
        bio: 'Co-Founder von Jamie. Immer für Sport & Outdoor zu haben! 🏃‍♂️',
        city: 'Wien',
        isVerified: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'tina@jamie-app.com' },
      update: {},
      create: {
        email: 'tina@jamie-app.com',
        username: 'Tina',
        password: hashedPassword,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tina',
        bio: 'Co-Founderin. Party-Organisatorin & Kultur-Liebhaberin 🎭',
        city: 'Wien',
        isVerified: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'arno@jamie-app.com' },
      update: {},
      create: {
        email: 'arno@jamie-app.com',
        username: 'Arno',
        password: hashedPassword,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arno',
        bio: 'Co-Founder. Food & Social Events sind mein Ding! 🍕',
        city: 'Wien',
        isVerified: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'demo@jamie-app.com' },
      update: {},
      create: {
        email: 'demo@jamie-app.com',
        username: 'DemoUser',
        password: hashedPassword,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DemoUser',
        bio: 'Demo Account zum Testen der App',
        city: 'Wien'
      }
    })
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create sample activity groups
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const groups = await Promise.all([
    // Sport
    prisma.activityGroup.create({
      data: {
        title: 'Beachvolleyball am Donaukanal',
        description: 'Spontanes Beachvolleyball! Alle Levels willkommen. Wir bringen Bälle mit, einfach vorbeikommen und mitspielen! Nach dem Spiel gibt\'s ein Getränk zusammen.',
        category: 'SPORT',
        location: 'Donaukanal, Höhe Flex',
        city: 'Wien',
        date: tomorrow,
        maxMembers: 12,
        imageUrl: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=600',
        avatarSeeds: [1234, 5678, 9012],
        creatorId: users[0].id
      }
    }),
    prisma.activityGroup.create({
      data: {
        title: 'Laufrunde im Prater',
        description: 'Gemütliche 5-7km Runde durch den Prater. Tempo wird an die Gruppe angepasst. Danach Kaffee bei der Krieau?',
        category: 'SPORT',
        location: 'Praterstern, beim Riesenrad',
        city: 'Wien',
        date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        maxMembers: 8,
        imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600',
        avatarSeeds: [3456, 7890],
        creatorId: users[0].id
      }
    }),

    // Party
    prisma.activityGroup.create({
      data: {
        title: 'Techno Night @ Grelle Forelle',
        description: 'Wer hat Lust auf tanzen? Line-up schaut gut aus. Vorglühen ab 22h im Wirr, dann rüber zur Grelle!',
        category: 'PARTY',
        location: 'Grelle Forelle',
        city: 'Wien',
        date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        maxMembers: 10,
        imageUrl: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=600',
        avatarSeeds: [2345, 6789, 1357],
        creatorId: users[1].id
      }
    }),

    // Kultur
    prisma.activityGroup.create({
      data: {
        title: 'Museumsbesuch: Albertina Modern',
        description: 'Aktuelle Ausstellung anschauen und danach bei einem Kaffee darüber plaudern. Kunst muss man nicht verstehen, um sie zu genießen!',
        category: 'KULTUR',
        location: 'Albertina Modern, Karlsplatz',
        city: 'Wien',
        date: nextWeek,
        maxMembers: 6,
        imageUrl: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600',
        avatarSeeds: [4567, 8901],
        creatorId: users[1].id
      }
    }),

    // Social
    prisma.activityGroup.create({
      data: {
        title: 'Feierabendbier am Donaukanal',
        description: 'Nach der Arbeit zusammen was trinken und quatschen. Ich bring Snacks mit! Einfach vorbeikommen, wir sitzen bei den Bänken.',
        category: 'SOCIAL',
        location: 'Donaukanal, Tel Aviv Beach',
        city: 'Wien',
        date: tomorrow,
        maxMembers: 15,
        imageUrl: 'https://images.unsplash.com/photo-1575037614876-c38a4f44f5b8?w=600',
        avatarSeeds: [5678, 9012, 3456, 7890],
        creatorId: users[2].id
      }
    }),

    // Food
    prisma.activityGroup.create({
      data: {
        title: 'Naschmarkt Food Tour',
        description: 'Wir probieren uns gemeinsam durch den Naschmarkt! Von Falafel bis Käse, von Oliven bis Baklava. Komm hungrig!',
        category: 'FOOD',
        location: 'Naschmarkt, Haupteingang',
        city: 'Wien',
        date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        maxMembers: 8,
        imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600',
        avatarSeeds: [6789, 1234],
        creatorId: users[2].id
      }
    }),

    // Natur
    prisma.activityGroup.create({
      data: {
        title: 'Wanderung am Kahlenberg',
        description: 'Gemütliche Wanderung mit schönem Ausblick über Wien. Ca. 3h, mittlere Schwierigkeit. Wir kehren danach beim Heurigen ein!',
        category: 'NATUR',
        location: 'Endstation 38A Kahlenberg',
        city: 'Wien',
        date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        maxMembers: 10,
        imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600',
        avatarSeeds: [7890, 1234, 5678],
        creatorId: users[0].id
      }
    }),

    // Berlin groups
    prisma.activityGroup.create({
      data: {
        title: 'Spree-Spaziergang & Drinks',
        description: 'Entspannter Spaziergang entlang der Spree mit anschließendem Sundowner in einer Bar. Neue Leute kennenlernen in entspannter Atmosphäre!',
        category: 'SOCIAL',
        location: 'Oberbaumbrücke',
        city: 'Berlin',
        date: tomorrow,
        maxMembers: 12,
        imageUrl: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=600',
        avatarSeeds: [8901, 2345],
        creatorId: users[1].id
      }
    }),

    // München groups
    prisma.activityGroup.create({
      data: {
        title: 'Biergarten Treffen',
        description: 'Klassischer Biergarten Abend im Englischen Garten! Brotzeit & Bier in geselliger Runde. Alle sind willkommen!',
        category: 'SOCIAL',
        location: 'Chinesischer Turm',
        city: 'München',
        date: nextWeek,
        maxMembers: 20,
        imageUrl: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600',
        avatarSeeds: [9012, 3456, 7890],
        creatorId: users[2].id
      }
    })
  ]);

  console.log(`✅ Created ${groups.length} activity groups`);

  // Add some participants
  await prisma.participant.createMany({
    data: [
      { userId: users[1].id, groupId: groups[0].id, status: 'APPROVED' },
      { userId: users[2].id, groupId: groups[0].id, status: 'APPROVED' },
      { userId: users[3].id, groupId: groups[0].id, status: 'PENDING', message: 'Hey, kann ich mitmachen?' },
      { userId: users[0].id, groupId: groups[4].id, status: 'APPROVED' },
      { userId: users[1].id, groupId: groups[4].id, status: 'APPROVED' },
    ],
    skipDuplicates: true
  });

  console.log('✅ Added participants');

  console.log('🎉 Seeding complete!');
  console.log('\n📧 Demo Login:');
  console.log('   Email: demo@jamie-app.com');
  console.log('   Password: demo123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });