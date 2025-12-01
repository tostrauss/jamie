// backend/prisma/seed.ts
import { PrismaClient, Category, ParticipantStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.activityGroup.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const passwordHash = await bcrypt.hash('Test1234', 12);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'max@example.com',
        username: 'MaxMustermann',
        passwordHash,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=max',
        bio: 'Sportbegeistert und immer für Abenteuer bereit! 🏃‍♂️',
        city: 'Wien',
        emailVerified: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'anna@example.com',
        username: 'AnnaB',
        passwordHash,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=anna',
        bio: 'Kulturliebhaberin und Foodie 🎭🍕',
        city: 'Graz',
        emailVerified: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'tom@example.com',
        username: 'TomTraveler',
        passwordHash,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tom',
        bio: 'Reisen ist meine Leidenschaft ✈️',
        city: 'München',
        emailVerified: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'lisa@example.com',
        username: 'LisaGamer',
        passwordHash,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa',
        bio: 'Gaming & Technik 🎮',
        city: 'Berlin',
        emailVerified: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'david@example.com',
        username: 'DavidNature',
        passwordHash,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david',
        bio: 'Wandern, Klettern, Natur genießen 🏔️',
        city: 'Innsbruck',
        emailVerified: true
      }
    })
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create groups
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const groups = await Promise.all([
    prisma.activityGroup.create({
      data: {
        title: 'Fußball im Prater',
        description: 'Lockeres Kicken am Wochenende. Alle Levels willkommen! Bringt Wasser mit. 🥅⚽',
        imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
        category: Category.SPORT,
        location: 'Prater Hauptallee',
        city: 'Wien',
        date: tomorrow,
        maxMembers: 14,
        creatorId: users[0].id
      }
    }),
    prisma.activityGroup.create({
      data: {
        title: 'Techno Night @ Flex',
        description: 'Wir feiern bis zum Morgengrauen! Lineup: Ben Klock, Amelie Lens 🎵',
        imageUrl: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800',
        category: Category.PARTY,
        location: 'Flex Club',
        city: 'Wien',
        date: nextWeek,
        maxMembers: 8,
        creatorId: users[0].id
      }
    }),
    prisma.activityGroup.create({
      data: {
        title: 'Museum & Kaffee',
        description: 'Kunsthistorisches Museum besuchen und danach gemütlich Kaffee trinken ☕🎨',
        imageUrl: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800',
        category: Category.KULTUR,
        location: 'Kunsthistorisches Museum',
        city: 'Wien',
        date: tomorrow,
        maxMembers: 6,
        creatorId: users[1].id
      }
    }),
    prisma.activityGroup.create({
      data: {
        title: 'Wanderung am Schöckl',
        description: 'Gemütliche Wanderung mit Einkehr. Ca. 3h, mittlere Kondition. 🥾',
        imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800',
        category: Category.NATUR,
        location: 'Schöckl Bergstation',
        city: 'Graz',
        date: nextWeek,
        maxMembers: 10,
        creatorId: users[4].id
      }
    }),
    prisma.activityGroup.create({
      data: {
        title: 'Gaming Abend - Mario Kart',
        description: 'Nintendo Switch Turnier! Snacks sind vorhanden 🎮🍕',
        imageUrl: 'https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=800',
        category: Category.GAMING,
        location: 'Meine Wohnung (Adresse per DM)',
        city: 'Berlin',
        date: tomorrow,
        maxMembers: 8,
        creatorId: users[3].id
      }
    }),
    prisma.activityGroup.create({
      data: {
        title: 'Ramen Workshop',
        description: 'Wir kochen authentische japanische Ramen! Alle Zutaten inklusive. 🍜',
        imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
        category: Category.FOOD,
        location: 'Kochstudio Zentral',
        city: 'München',
        date: nextWeek,
        maxMembers: 12,
        creatorId: users[2].id
      }
    }),
    prisma.activityGroup.create({
      data: {
        title: 'Afterwork Drinks',
        description: 'Entspanntes Netzwerken bei Drinks. Alle Branchen willkommen! 🍻',
        imageUrl: 'https://images.unsplash.com/photo-1575037614876-c38a4c44f5bd?w=800',
        category: Category.SOCIAL,
        location: 'Sky Bar',
        city: 'Wien',
        date: tomorrow,
        maxMembers: 20,
        creatorId: users[1].id
      }
    }),
    prisma.activityGroup.create({
      data: {
        title: 'Wochenendtrip nach Prag',
        description: 'Spontaner Roadtrip! Abfahrt Freitag Abend, zurück Sonntag. 🚗✨',
        imageUrl: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=800',
        category: Category.TRAVEL,
        location: 'Treffpunkt: Westbahnhof',
        city: 'Wien',
        date: nextWeek,
        maxMembers: 4,
        creatorId: users[2].id
      }
    })
  ]);

  console.log(`✅ Created ${groups.length} groups`);

  // Create participants
  const participants = await Promise.all([
    // Fußball
    prisma.participant.create({
      data: {
        userId: users[1].id,
        groupId: groups[0].id,
        status: ParticipantStatus.APPROVED
      }
    }),
    prisma.participant.create({
      data: {
        userId: users[2].id,
        groupId: groups[0].id,
        status: ParticipantStatus.APPROVED
      }
    }),
    prisma.participant.create({
      data: {
        userId: users[3].id,
        groupId: groups[0].id,
        status: ParticipantStatus.PENDING,
        message: 'Hey, kann ich mitmachen? Spiele seit 5 Jahren!'
      }
    }),
    // Techno Night
    prisma.participant.create({
      data: {
        userId: users[1].id,
        groupId: groups[1].id,
        status: ParticipantStatus.APPROVED
      }
    }),
    // Museum
    prisma.participant.create({
      data: {
        userId: users[0].id,
        groupId: groups[2].id,
        status: ParticipantStatus.APPROVED
      }
    }),
    // Gaming
    prisma.participant.create({
      data: {
        userId: users[0].id,
        groupId: groups[4].id,
        status: ParticipantStatus.APPROVED
      }
    }),
    prisma.participant.create({
      data: {
        userId: users[2].id,
        groupId: groups[4].id,
        status: ParticipantStatus.PENDING,
        message: 'Bin dabei! Bin der beste Mario Kart Spieler 😎'
      }
    }),
    // Ramen
    prisma.participant.create({
      data: {
        userId: users[1].id,
        groupId: groups[5].id,
        status: ParticipantStatus.APPROVED
      }
    }),
    prisma.participant.create({
      data: {
        userId: users[4].id,
        groupId: groups[5].id,
        status: ParticipantStatus.APPROVED
      }
    })
  ]);

  console.log(`✅ Created ${participants.length} participants`);

  // Create messages
  const messages = await Promise.all([
    prisma.message.create({
      data: {
        content: 'Freue mich schon auf morgen! 🎉',
        senderId: users[0].id,
        groupId: groups[0].id
      }
    }),
    prisma.message.create({
      data: {
        content: 'Ich bringe einen Ball mit!',
        senderId: users[1].id,
        groupId: groups[0].id
      }
    }),
    prisma.message.create({
      data: {
        content: 'Top, bis dann! ⚽',
        senderId: users[2].id,
        groupId: groups[0].id
      }
    }),
    prisma.message.create({
      data: {
        content: 'Wer ist noch dabei?',
        senderId: users[3].id,
        groupId: groups[4].id
      }
    }),
    prisma.message.create({
      data: {
        content: 'Ich! 🙋‍♂️',
        senderId: users[0].id,
        groupId: groups[4].id
      }
    })
  ]);

  console.log(`✅ Created ${messages.length} messages`);

  // Create notifications
  const notifications = await Promise.all([
    prisma.notification.create({
      data: {
        type: 'JOIN_REQUEST',
        title: 'Neue Beitrittsanfrage',
        content: 'LisaGamer möchte "Fußball im Prater" beitreten',
        userId: users[0].id,
        groupId: groups[0].id
      }
    }),
    prisma.notification.create({
      data: {
        type: 'REQUEST_APPROVED',
        title: 'Anfrage angenommen!',
        content: 'Du wurdest zu "Gaming Abend - Mario Kart" hinzugefügt',
        userId: users[0].id,
        groupId: groups[4].id,
        isRead: true
      }
    }),
    prisma.notification.create({
      data: {
        type: 'NEW_MESSAGE',
        title: 'Neue Nachricht',
        content: 'AnnaB in "Fußball im Prater": Ich bringe einen Ball mit!',
        userId: users[0].id,
        groupId: groups[0].id
      }
    })
  ]);

  console.log(`✅ Created ${notifications.length} notifications`);

  console.log('');
  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('📧 Test accounts (Password: Test1234):');
  users.forEach(u => {
    console.log(`   - ${u.email} (${u.username})`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });