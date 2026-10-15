import { Router } from 'express';
import db from '../db.js';
import { checkAssignment, clearSemester } from './crud.js';

const router = Router();

// Set (or clear) the teacher for one subject of one class. Used by the Semester planner screen.
// Body: { class_id, subject_id, faculty_id }  (faculty_id "" or null removes the assignment)
router.post('/planner/assign', (req, res) => {
  try {
    const class_id = Number(req.body?.class_id), subject_id = Number(req.body?.subject_id);
    const raw = req.body?.faculty_id;
    const faculty_id = raw === '' || raw == null ? null : Number(raw);
    if (!Number.isInteger(class_id) || !Number.isInteger(subject_id) || (faculty_id !== null && !Number.isInteger(faculty_id)))
      throw new Error('Please check the selection.');
    checkAssignment({ class_id, subject_id });

    const { semester } = db.prepare('SELECT semester FROM classes WHERE id=?').get(class_id);
    const existing = db.prepare('SELECT id FROM assignments WHERE class_id=? AND subject_id=?').get(class_id, subject_id);
    if (faculty_id === null) {
      if (existing) db.prepare('DELETE FROM assignments WHERE id=?').run(existing.id);
    } else if (existing) {
      db.prepare('UPDATE assignments SET faculty_id=? WHERE id=?').run(faculty_id, existing.id);
    } else {
      db.prepare('INSERT INTO assignments(class_id,subject_id,faculty_id) VALUES(?,?,?)').run(class_id, subject_id, faculty_id);
    }
    clearSemester(semester);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: (e.code || '').includes('FOREIGNKEY') ? 'Teacher not found.' : e.message });
  }
});

export default router;
