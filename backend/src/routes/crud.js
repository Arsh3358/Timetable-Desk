import { Router } from 'express';
import db, { setIssues } from '../db.js';

const VENUE_TYPES = ['Classroom', 'Lab'];
// s = text, n = whole number, o = optional whole number, v = Classroom|Lab
const TABLES = {
  departments: { name: 's', teacher_count: 'n' },
  classes: { department_id: 'n', semester: 'n', section: 's' },
  faculty: { name: 's', department_id: 'n', weekly_load: 'n' },
  subjects: { name: 's', department_id: 'n', semester: 'n', hours_per_week: 'n', venue_type: 'v' },
  venues: { name: 's', type: 'v', capacity: 'n' },
  assignments: { class_id: 'n', subject_id: 'n', faculty_id: 'n', venue_id: 'o' },
};
const DUPLICATE = {
  departments: 'A department with this name already exists.',
  classes: 'This class (department, semester and section) already exists.',
  venues: 'A venue with this name already exists.',
  assignments: 'This subject already has a teacher for this class.',
};

function clean(spec, body) {
  const out = {};
  for (const [key, type] of Object.entries(spec)) {
    let v = body[key];
    const label = key.replace(/_/g, ' ');
    if (type === 'o' && (v === '' || v == null)) { out[key] = null; continue; }
    if (type === 's') { v = String(v ?? '').trim(); if (!v) throw new Error(`${label} is required.`); }
    else if (type === 'v') { if (!VENUE_TYPES.includes(v)) throw new Error('Type must be Classroom or Lab.'); }
    else { v = Number(v); if (!Number.isInteger(v)) throw new Error(`${label} must be a whole number.`); }
    out[key] = v;
  }
  return out;
}

// A subject can only be taught to a class of the same department and semester.
export function checkAssignment(d) {
  const c = db.prepare('SELECT * FROM classes WHERE id=?').get(d.class_id);
  const s = db.prepare('SELECT * FROM subjects WHERE id=?').get(d.subject_id);
  if (!c || !s) throw new Error('Class or subject not found.');
  if (c.department_id !== s.department_id || c.semester !== s.semester)
    throw new Error('That subject belongs to a different department or semester than the class.');
}

// Changing teaching assignments makes that semester's timetable stale, so clear only that semester.
export function clearSemester(semester) {
  db.prepare('DELETE FROM timetable WHERE class_id IN (SELECT id FROM classes WHERE semester=?)').run(semester);
  setIssues(semester, []);
}

const router = Router();
for (const [table, spec] of Object.entries(TABLES)) {
  router.get(`/${table}`, (req, res) => res.json(db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()));

  router.post(`/${table}`, (req, res) => {
    try {
      const data = clean(spec, req.body || {});
      if (table === 'assignments') checkAssignment(data);
      const cols = Object.keys(data);
      const info = db.prepare(`INSERT INTO ${table}(${cols.join(',')}) VALUES(${cols.map((c) => '@' + c).join(',')})`).run(data);
      if (table === 'assignments') clearSemester(db.prepare('SELECT semester FROM classes WHERE id=?').get(data.class_id).semester);
      res.status(201).json({ id: Number(info.lastInsertRowid), ...data });
    } catch (e) {
      const code = e.code || '';
      if (code.includes('UNIQUE')) return res.status(409).json({ error: DUPLICATE[table] || 'This record already exists.' });
      if (code.includes('FOREIGNKEY')) return res.status(400).json({ error: 'A linked record does not exist.' });
      if (code.includes('CHECK')) return res.status(400).json({ error: 'A value is out of the allowed range (semester must be 1 to 8).' });
      res.status(400).json({ error: e.message });
    }
  });

  router.delete(`/${table}/:id`, (req, res) => {
    const id = Number(req.params.id);
    const sem = table === 'assignments'
      ? db.prepare('SELECT c.semester FROM assignments a JOIN classes c ON c.id=a.class_id WHERE a.id=?').get(id)?.semester : null;
    const info = db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id);
    if (!info.changes) return res.status(404).json({ error: 'Not found.' });
    if (sem) clearSemester(sem);
    res.json({ ok: true });
  });
}
export default router;
