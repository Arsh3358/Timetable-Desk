import { Router } from 'express';
import db from '../db.js';

const router = Router();

function conflict(venueId, facultyId, day, period) {
  const args = [day, period, venueId, facultyId];
  const t = db.prepare('SELECT venue_id FROM timetable WHERE day=? AND period=? AND (venue_id=? OR faculty_id=?)').get(...args);
  if (t) return t.venue_id === venueId ? 'That venue has a class in this slot.' : 'That teacher is teaching in this slot.';
  const b = db.prepare('SELECT venue_id FROM bookings WHERE day=? AND period=? AND (venue_id=? OR faculty_id=?)').get(...args);
  if (b) return b.venue_id === venueId ? 'That venue is already booked in this slot.' : 'That teacher has another booking in this slot.';
  return null;
}

router.get('/bookings', (req, res) => {
  res.json(db.prepare('SELECT * FROM bookings ORDER BY day, period').all());
});

router.post('/bookings', (req, res) => {
  const { venue_id, faculty_id, day, period, length = 1, purpose } = req.body || {};
  const v = Number(venue_id), f = Number(faculty_id), d = Number(day), p = Number(period), n = Number(length);
  if (![v, f, d, p, n].every(Number.isInteger) || d < 0 || d > 4 || p < 0 || n < 1 || n > 3)
    return res.status(400).json({ error: 'Please check the booking details.' });
  if (p + n > 8) return res.status(400).json({ error: 'The booking runs past the last period.' });
  for (let q = 0; q < n; q++) {
    const msg = conflict(v, f, d, p + q);
    if (msg) return res.status(409).json({ error: msg });
  }
  try {
    const ins = db.prepare('INSERT INTO bookings(venue_id,faculty_id,day,period,purpose) VALUES(?,?,?,?,?)');
    db.transaction(() => { for (let q = 0; q < n; q++) ins.run(v, f, d, p + q, String(purpose || '').trim() || 'Lab session'); })();
    res.status(201).json({ ok: true });
  } catch {
    res.status(400).json({ error: 'Venue or teacher not found.' });
  }
});

router.delete('/bookings/:id', (req, res) => {
  db.prepare('DELETE FROM bookings WHERE id=?').run(Number(req.params.id));
  res.json({ ok: true });
});

export default router;
