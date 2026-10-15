import { Router } from 'express';
import db from '../db.js';

const router = Router();
const WEEK_SLOTS = 40;

router.get('/dashboard', (req, res) => {
  const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
  const venues = db.prepare(`SELECT v.id, v.name, v.type,
      (SELECT COUNT(*) FROM timetable WHERE venue_id=v.id) + (SELECT COUNT(*) FROM bookings WHERE venue_id=v.id) AS used
      FROM venues v ORDER BY v.id`).all();
  const faculty = db.prepare(`SELECT f.id, f.name, f.weekly_load,
      (SELECT COUNT(*) FROM timetable WHERE faculty_id=f.id) AS scheduled FROM faculty f ORDER BY f.id`).all();
  const conflicts = db.prepare(`SELECT COUNT(*) c FROM timetable t JOIN bookings b
      ON b.day=t.day AND b.period=t.period AND (b.venue_id=t.venue_id OR b.faculty_id=t.faculty_id)`).get().c;
  res.json({
    totals: { departments: count('departments'), classes: count('classes'), faculty: count('faculty'), venues: count('venues'), sessions: count('timetable'), conflicts },
    venues, faculty, weekSlots: WEEK_SLOTS,
    semesters: db.prepare(`SELECT c.semester, COUNT(DISTINCT c.id) AS classes, COUNT(t.id) AS sessions
      FROM classes c LEFT JOIN timetable t ON t.class_id=c.id GROUP BY c.semester ORDER BY c.semester`).all(),
  });
});

router.get('/availability', (req, res) => {
  const day = Number(req.query.day), period = Number(req.query.period);
  if (!(day >= 0 && day <= 4 && period >= 0 && period <= 7)) return res.status(400).json({ error: 'Invalid day or period.' });
  const rows = db.prepare(`SELECT v.id, v.name, v.type, v.capacity,
      s.name AS subject, f.name AS teacher, b.purpose, bf.name AS booked_by
      FROM venues v
      LEFT JOIN timetable t ON t.venue_id=v.id AND t.day=@day AND t.period=@period
      LEFT JOIN subjects s ON s.id=t.subject_id
      LEFT JOIN faculty f ON f.id=t.faculty_id
      LEFT JOIN bookings b ON b.venue_id=v.id AND b.day=@day AND b.period=@period
      LEFT JOIN faculty bf ON bf.id=b.faculty_id
      ORDER BY v.id`).all({ day, period });
  const venues = rows.map((r) => ({
    id: r.id, name: r.name, type: r.type, capacity: r.capacity,
    status: r.subject || r.purpose ? 'busy' : 'free',
    detail: r.subject ? `${r.subject} with ${r.teacher}` : r.purpose ? `Booked: ${r.purpose} (${r.booked_by})` : null,
  }));
  const freeTeachers = db.prepare(`SELECT id, name FROM faculty
      WHERE id NOT IN (SELECT faculty_id FROM timetable WHERE day=@day AND period=@period)
      AND id NOT IN (SELECT faculty_id FROM bookings WHERE day=@day AND period=@period) ORDER BY id`).all({ day, period });
  res.json({ venues, freeTeachers });
});

router.get('/reports/workload', (req, res) => {
  res.json(db.prepare(`SELECT f.id, f.name, d.name AS department, f.weekly_load AS required,
      COALESCE((SELECT SUM(s.hours_per_week) FROM assignments a JOIN subjects s ON s.id=a.subject_id WHERE a.faculty_id=f.id),0) AS assigned,
      (SELECT COUNT(*) FROM timetable WHERE faculty_id=f.id) AS scheduled,
      (SELECT COUNT(*) FROM bookings WHERE faculty_id=f.id) AS booked
      FROM faculty f JOIN departments d ON d.id=f.department_id ORDER BY f.id`).all());
});

export default router;
