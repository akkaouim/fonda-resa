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
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Parsing
app.use(express.json());
app.use(cookieParser());

// Static files (uploaded photos)
app.use('/uploads', express.static(env.UPLOAD_DIR));

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

// Error handler (must be last)
app.use(errorHandler);

export { app };
