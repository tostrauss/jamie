// backend/src/app.ts (Update)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { groupRoutes } from './routes/groups.routes';
import { authRoutes } from './routes/auth.routes'; // Neu
import { userRoutes } from './routes/users.routes'; // Neu

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);   // Neu: Login/Register
app.use('/api/users', userRoutes);  // Neu: Profil
app.use('/api/groups', groupRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Jamie Backend läuft auf http://localhost:${PORT}`);
});