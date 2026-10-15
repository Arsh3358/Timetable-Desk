import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ensureAdmin, requireAuth } from './auth.js';
import authRoutes from './routes/auth.js';
import crud from './routes/crud.js';
import planner from './routes/planner.js';
import timetable from './routes/timetable.js';
import bookings from './routes/bookings.js';
import insights from './routes/insights.js';
import exporter from './routes/export.js';

const app = express();
const origins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : true;
app.use(cors({ origin: origins }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Public: sign in, create account, forgot and reset password (each rate limited)
app.use('/api/auth', authRoutes);

// Everything below needs a valid admin token
app.use('/api', requireAuth);
app.use('/api', crud);
app.use('/api', planner);
app.use('/api', timetable);
app.use('/api', bookings);
app.use('/api', insights);
app.use('/api', exporter);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Something went wrong on the server.' }); });

ensureAdmin();
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Timetable Desk API running on http://localhost:${port}`));
