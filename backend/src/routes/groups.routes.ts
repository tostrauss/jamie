// backend/src/routes/groups.routes.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/groups - Alle Gruppen abrufen
router.get('/', async (req, res) => {
  try {
    const groups = await prisma.activityGroup.findMany({
      include: {
        creator: {
          select: { username: true, avatarUrl: true } // Wir wollen nur bestimmte User-Daten
        },
        participants: true // Damit wir wissen, wie viele dabei sind
      },
      orderBy: {
        date: 'asc' // Die nächsten Events zuerst
      }
    });
    
    // Mapping für das Frontend (falls nötig, um die Struktur anzupassen)
    const formattedGroups = groups.map(g => ({
      ...g,
      currentMembers: g.participants.length + 1 // +1 für den Creator
    }));

    res.json(formattedGroups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Konnte Gruppen nicht laden' });
  }
});

// POST /api/groups - Neue Gruppe erstellen
router.post('/', async (req, res) => {
  const { title, description, category, location, date, maxMembers } = req.body;
  
  // TODO: Hier später die echte User-ID aus dem JWT Token holen (Auth)
  // Für jetzt nehmen wir einen Dummy-User oder erstellen einen, falls keiner existiert
  let creator = await prisma.user.findFirst();
  if (!creator) {
      creator = await prisma.user.create({
          data: { email: 'test@jamie.com', username: 'JamieTester', password: 'hash' }
      });
  }

  try {
    const newGroup = await prisma.activityGroup.create({
      data: {
        title,
        description,
        category,
        location,
        date: new Date(date), // String zu Date konvertieren
        maxMembers: maxMembers || 10,
        imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b', // Platzhalter oder Upload Logik
        avatarSeeds: [Math.floor(Math.random() * 5000)], // Zufälliger Avatar für den Start
        creatorId: creator.id
      }
    });
    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(400).json({ error: 'Konnte Gruppe nicht erstellen' });
  }
});

export const groupRoutes = router;