// backend/src/routes/upload.routes.ts
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// UPLOAD CONFIGURATION
// ============================================
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Ensure upload directories exist
const directories = ['avatars', 'photos', 'groups', 'clubs', 'temp'];
directories.forEach(dir => {
  const fullPath = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(UPLOAD_DIR, 'temp'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Nur Bilder erlaubt (JPEG, PNG, WebP, GIF)'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

// ============================================
// HELPER FUNCTIONS
// ============================================
async function processImage(
  inputPath: string,
  outputPath: string,
  options: { width?: number; height?: number; quality?: number }
): Promise<void> {
  const { width, height, quality = 80 } = options;
  
  let processor = sharp(inputPath);
  
  if (width || height) {
    processor = processor.resize(width, height, {
      fit: 'cover',
      position: 'center'
    });
  }
  
  await processor
    .jpeg({ quality })
    .toFile(outputPath);
}

function getPublicUrl(filePath: string): string {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/${filePath}`;
}

async function deleteFile(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
}

// ============================================
// POST /api/upload/avatar - Upload avatar
// ============================================
router.post('/avatar', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    const tempPath = req.file.path;
    const filename = `${userId}_${Date.now()}.jpg`;
    const outputDir = path.join(UPLOAD_DIR, 'avatars');
    const outputPath = path.join(outputDir, filename);

    // Process image: resize to 400x400
    await processImage(tempPath, outputPath, { width: 400, height: 400, quality: 85 });

    // Delete temp file
    await deleteFile(tempPath);

    // Get the public URL
    const avatarUrl = getPublicUrl(`uploads/avatars/${filename}`);

    // Update user's avatar in database
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl }
    });

    res.json({ 
      url: avatarUrl,
      message: 'Avatar erfolgreich hochgeladen'
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Fehler beim Hochladen' });
  }
});

// ============================================
// POST /api/upload/photo - Upload profile photo
// ============================================
router.post('/photo', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    const tempPath = req.file.path;
    const filename = `${userId}_${uuidv4()}.jpg`;
    const outputDir = path.join(UPLOAD_DIR, 'photos');
    const outputPath = path.join(outputDir, filename);

    // Process image: max 1200px, keep aspect ratio
    await processImage(tempPath, outputPath, { width: 1200, quality: 85 });

    // Delete temp file
    await deleteFile(tempPath);

    const photoUrl = getPublicUrl(`uploads/photos/${filename}`);

    res.json({ 
      url: photoUrl,
      message: 'Foto erfolgreich hochgeladen'
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Fehler beim Hochladen' });
  }
});

// ============================================
// POST /api/upload/photos - Upload multiple photos
// ============================================
router.post('/photos', authenticateToken, upload.array('files', 6), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Keine Dateien hochgeladen' });
    }

    const urls: string[] = [];

    for (const file of files) {
      const tempPath = file.path;
      const filename = `${userId}_${uuidv4()}.jpg`;
      const outputDir = path.join(UPLOAD_DIR, 'photos');
      const outputPath = path.join(outputDir, filename);

      await processImage(tempPath, outputPath, { width: 1200, quality: 85 });
      await deleteFile(tempPath);

      urls.push(getPublicUrl(`uploads/photos/${filename}`));
    }

    res.json({ 
      urls,
      count: urls.length,
      message: `${urls.length} Fotos erfolgreich hochgeladen`
    });
  } catch (error) {
    console.error('Error uploading photos:', error);
    res.status(500).json({ error: 'Fehler beim Hochladen' });
  }
});

// ============================================
// POST /api/upload/group - Upload group image
// ============================================
router.post('/group', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    const { groupId } = req.body;

    const tempPath = req.file.path;
    const filename = `${groupId || uuidv4()}_${Date.now()}.jpg`;
    const outputDir = path.join(UPLOAD_DIR, 'groups');
    const outputPath = path.join(outputDir, filename);

    // Process image: 800x600 for groups
    await processImage(tempPath, outputPath, { width: 800, height: 600, quality: 85 });
    await deleteFile(tempPath);

    const imageUrl = getPublicUrl(`uploads/groups/${filename}`);

    // If groupId provided, update the group
    if (groupId) {
      // Verify ownership
      const group = await prisma.activityGroup.findUnique({ where: { id: groupId } });
      if (group && group.creatorId === userId) {
        await prisma.activityGroup.update({
          where: { id: groupId },
          data: { imageUrl }
        });
      }
    }

    res.json({ 
      url: imageUrl,
      message: 'Bild erfolgreich hochgeladen'
    });
  } catch (error) {
    console.error('Error uploading group image:', error);
    res.status(500).json({ error: 'Fehler beim Hochladen' });
  }
});

// ============================================
// POST /api/upload/club - Upload club image
// ============================================
router.post('/club', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    const { clubId } = req.body;

    const tempPath = req.file.path;
    const filename = `${clubId || uuidv4()}_${Date.now()}.jpg`;
    const outputDir = path.join(UPLOAD_DIR, 'clubs');
    const outputPath = path.join(outputDir, filename);

    // Process image
    await processImage(tempPath, outputPath, { width: 800, height: 600, quality: 85 });
    await deleteFile(tempPath);

    const imageUrl = getPublicUrl(`uploads/clubs/${filename}`);

    // If clubId provided, update the club
    if (clubId) {
      const club = await prisma.club.findUnique({ where: { id: clubId } });
      if (club && club.creatorId === userId) {
        await prisma.club.update({
          where: { id: clubId },
          data: { imageUrl }
        });
      }
    }

    res.json({ 
      url: imageUrl,
      message: 'Bild erfolgreich hochgeladen'
    });
  } catch (error) {
    console.error('Error uploading club image:', error);
    res.status(500).json({ error: 'Fehler beim Hochladen' });
  }
});

// ============================================
// DELETE /api/upload/:type/:filename - Delete uploaded file
// ============================================
router.delete('/:type/:filename', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const { type, filename } = req.params;
    
    // Validate type
    if (!directories.includes(type)) {
      return res.status(400).json({ error: 'Ungültiger Dateityp' });
    }

    // Verify ownership by checking if filename starts with userId
    if (!filename.startsWith(userId)) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    const filePath = path.join(UPLOAD_DIR, type, filename);
    await deleteFile(filePath);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
router.use((error: any, req: AuthRequest, res: Response, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Datei zu groß (max. 10MB)' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  if (error.message === 'Nur Bilder erlaubt (JPEG, PNG, WebP, GIF)') {
    return res.status(400).json({ error: error.message });
  }

  console.error('Upload error:', error);
  res.status(500).json({ error: 'Fehler beim Hochladen' });
});

export default router;

// ============================================
// USAGE IN SERVER.TS
// ============================================
/*
import express from 'express';
import uploadRoutes from './routes/upload.routes';

const app = express();

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Upload routes
app.use('/api/upload', uploadRoutes);
*/

// ============================================
// REQUIRED PACKAGES (package.json)
// ============================================
/*
{
  "dependencies": {
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.2",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/multer": "^1.4.11"
  }
}
*/