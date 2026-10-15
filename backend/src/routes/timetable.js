import { Router } from 'express';
import db, { getIssues } from '../db.js';
import { generate } from '../scheduler.js';

const router = Router();

// entries for every semester, plus scheduling notes grouped by semester: { "3": ["..."] }
router.get('/timetable', (req, res) => {
  res.json({ entries: db.prepare('SELECT * FROM timetable ORDER BY day, period').all(), issues: getIssues() });
});

// Body: { semester: 1..8 }. Rebuilds only that semester; other semesters are untouched.
router.post('/timetable/generate', (req, res) => {
  const semester = Number(req.body?.semester);
  if (!Number.isInteger(semester) || semester < 1 || semester > 8) return res.status(400).json({ error: 'Choose a semester from 1 to 8.' });
  try { res.json(generate(semester)); } catch (e) { res.status(400).json({ error: e.message }); }
});

export default router;
