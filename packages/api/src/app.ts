import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { categoriesRoutes } from './modules/categories/categories.routes.js';
import { localisationsRoutes } from './modules/localisations/localisations.routes.js';
import { itemsRoutes } from './modules/items/items.routes.js';
import { reservationsRoutes } from './modules/reservations/reservations.routes.js';
import { mouvementsRoutes } from './modules/mouvements/mouvements.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin (no origin header), configured frontend, and ngrok URLs
    if (!origin || origin === env.FRONTEND_URL || origin.endsWith('.ngrok-free.app')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in dev; tighten in production
    }
  },
  credentials: true,
}));

// Parsing
app.use(express.json());
app.use(cookieParser());

// Serve frontend in production (or when built)
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Static files (uploaded photos) — resolve relative to project root
const uploadDir = path.isAbsolute(env.UPLOAD_DIR)
  ? env.UPLOAD_DIR
  : path.resolve(__dirname, '../../../', env.UPLOAD_DIR);
app.use('/uploads', express.static(uploadDir));
const frontendDist = path.resolve(__dirname, '../../web/dist');
app.use(express.static(frontendDist));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/localisations', localisationsRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/mouvements', mouvementsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// SPA fallback: serve index.html for non-API routes
import fs from 'fs';
const indexHtml = path.join(frontendDist, 'index.html');
app.use((req, res, next) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    next();
  }
});

// Error handler (must be last)
app.use(errorHandler);

export { app };
