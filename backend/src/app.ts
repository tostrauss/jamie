// backend/src/app.ts
import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http'; // WICHTIG
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initSocket } from './socket'; // WICHTIG
import { groupRoutes } from './routes/groups.routes';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/users.routes';

const app = express();
const httpServer = createServer(app); // HTTP Server erstellen

// Socket.io initialisieren
initSocket(httpServer);

const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// ... (Middleware bleibt gleich wie vorher) ...
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: isDev 
    ? ['http://localhost:4200', 'http://localhost:3000'] 
    : ['https://jamie-app.com', 'https://www.jamie-app.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 100,
  message: { error: 'Zu viele Anfragen. Bitte versuche es später erneut.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// ... (Routes bleiben gleich) ...
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);

app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint nicht gefunden' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  const message = isDev ? err.message : 'Ein interner Fehler ist aufgetreten';
  res.status(500).json({ error: message, ...(isDev && { stack: err.stack }) });
});

// SERVER START (geändert auf httpServer!)
httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   🚀 Jamie Backend & Socket Server         ║
║   URL:  http://localhost:${PORT}             ║
╚════════════════════════════════════════════╝
  `);
});

export default app;