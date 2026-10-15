// Loads demo data: node src/seed.js   (or: npm run seed)
import 'dotenv/config';
import db from './db.js';
import { ensureAdmin } from './auth.js';
import { generate } from './scheduler.js';

ensureAdmin();
db.transaction(() => {
  ['timetable', 'bookings', 'assignments', 'subjects', 'classes', 'faculty', 'venues', 'departments', 'meta'].forEach((t) => db.prepare(`DELETE FROM ${t}`).run());
  const id = (r) => Number(r.lastInsertRowid);
  const dept = (n, c) => id(db.prepare('INSERT INTO departments(name,teacher_count) VALUES(?,?)').run(n, c));
  const cls = (d, sem, sec) => id(db.prepare('INSERT INTO classes(department_id,semester,section) VALUES(?,?,?)').run(d, sem, sec));
  const fac = (n, d, l) => id(db.prepare('INSERT INTO faculty(name,department_id,weekly_load) VALUES(?,?,?)').run(n, d, l));
  const sub = (n, d, sem, h, t) => id(db.prepare('INSERT INTO subjects(name,department_id,semester,hours_per_week,venue_type) VALUES(?,?,?,?,?)').run(n, d, sem, h, t));
  const ven = (n, t, c) => id(db.prepare('INSERT INTO venues(name,type,capacity) VALUES(?,?,?)').run(n, t, c));
  const asg = (c, s, f) => db.prepare('INSERT INTO assignments(class_id,subject_id,faculty_id) VALUES(?,?,?)').run(c, s, f);

  const cs = dept('Computer Science', 3), ec = dept('Electronics', 2);
  const [anita, rahul, simran] = [fac('Dr. Anita Sharma', cs, 16), fac('Prof. Rahul Verma', cs, 16), fac('Dr. Simran Kaur', cs, 14)];
  const [gurpreet, neha] = [fac('Prof. Gurpreet Singh', ec, 12), fac('Dr. Neha Gupta', ec, 12)];
  ['Room 101', 'Room 102', 'Room 201', 'Room 202'].forEach((n, i) => ven(n, 'Classroom', [60, 60, 40, 40][i]));
  ven('CS Lab 1', 'Lab', 30); ven('Electronics Lab', 'Lab', 30);

  const cs3a = cls(cs, 3, 'A'), cs3b = cls(cs, 3, 'B'), cs5a = cls(cs, 5, 'A'), ec3a = cls(ec, 3, 'A');
  const ds = sub('Data Structures', cs, 3, 4, 'Classroom'), dbms = sub('DBMS', cs, 3, 4, 'Classroom');
  const dbmsLab = sub('DBMS Lab', cs, 3, 2, 'Lab'), cn = sub('Computer Networks', cs, 3, 3, 'Classroom');
  const os = sub('Operating Systems', cs, 5, 4, 'Classroom'), se = sub('Software Engineering', cs, 5, 3, 'Classroom'), py = sub('Python Lab', cs, 5, 2, 'Lab');
  const sig = sub('Signals and Systems', ec, 3, 4, 'Classroom'), de = sub('Digital Electronics', ec, 3, 3, 'Classroom'), dl = sub('Digital Lab', ec, 3, 2, 'Lab');

  [cs3a, cs3b].forEach((c) => { asg(c, ds, anita); asg(c, dbms, rahul); asg(c, dbmsLab, rahul); asg(c, cn, simran); });
  asg(cs5a, os, simran); asg(cs5a, se, anita); asg(cs5a, py, anita);
  asg(ec3a, sig, gurpreet); asg(ec3a, de, neha); asg(ec3a, dl, neha);
})();
console.log('Demo data loaded.', generate(3), generate(5));
