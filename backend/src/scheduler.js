import db, { setIssues } from './db.js';

const PERIODS = 8;          // P1..P8, lunch falls between P4 and P5
const LUNCH_AFTER = 4;
const MAX_PER_DAY = 6;      // hours one teacher may teach in a day

/**
 * Greedy constraint-based scheduler for ONE semester.
 * Other semesters' sessions are kept as they are and treated as busy time for teachers
 * and venues, and their hours count towards each teacher's weekly load.
 * Hard rules: a teacher, a class and a venue can each hold one session per slot; labs run
 * as 2-period blocks that never straddle lunch; a teacher never exceeds their weekly load
 * or MAX_PER_DAY. Sessions are spread over different days where possible.
 */
export function generate(semester) {
  const classIds = db.prepare('SELECT id FROM classes WHERE semester=?').all(semester).map((c) => c.id);
  if (!classIds.length) throw new Error(`There are no classes in semester ${semester} yet.`);
  const mine = new Set(classIds);

  const faculty = new Map(db.prepare('SELECT * FROM faculty').all().map((f) => [f.id, f]));
  const subjects = new Map(db.prepare('SELECT * FROM subjects').all().map((s) => [s.id, s]));
  const venues = db.prepare('SELECT * FROM venues ORDER BY id').all();

  const busy = new Set(), hours = {}, daily = {};
  db.prepare('SELECT * FROM bookings').all().forEach((b) => {
    busy.add(`v${b.venue_id}-${b.day}-${b.period}`);
    busy.add(`f${b.faculty_id}-${b.day}-${b.period}`);
  });
  db.prepare('SELECT * FROM timetable').all().filter((r) => !mine.has(r.class_id)).forEach((r) => {
    busy.add(`v${r.venue_id}-${r.day}-${r.period}`);
    busy.add(`f${r.faculty_id}-${r.day}-${r.period}`);
    hours[r.faculty_id] = (hours[r.faculty_id] || 0) + 1;
    daily[`${r.faculty_id}-${r.day}`] = (daily[`${r.faculty_id}-${r.day}`] || 0) + 1;
  });

  const jobs = db.prepare('SELECT * FROM assignments ORDER BY id').all()
    .filter((a) => mine.has(a.class_id))
    .map((a) => ({ a, s: subjects.get(a.subject_id), f: faculty.get(a.faculty_id) }))
    .filter((j) => j.s && j.f)
    .sort((x, y) => (y.s.venue_type === 'Lab') - (x.s.venue_type === 'Lab') || y.s.hours_per_week - x.s.hours_per_week);

  const rows = [], issues = [];
  if (!jobs.length) issues.push(`No teachers are assigned to subjects in semester ${semester} yet.`);

  jobs.forEach(({ a, s, f }, i) => {
    const len = s.venue_type === 'Lab' ? 2 : 1;
    const sessions = Math.ceil(s.hours_per_week / len);
    const pool = venues.filter((v) => (a.venue_id ? v.id === a.venue_id : v.type === s.venue_type));
    if (!pool.length) { issues.push(`No ${s.venue_type.toLowerCase()} venue is available for ${s.name}.`); return; }
    const usedDays = new Set();

    for (let k = 0; k < sessions; k++) {
      if ((hours[f.id] || 0) + len > f.weekly_load) {
        issues.push(`${f.name} reached the weekly load of ${f.weekly_load} h, so ${s.name} is only partly scheduled.`);
        break;
      }
      let placed = false;
      for (let pass = 0; pass < 2 && !placed; pass++) {
        for (let j = 0; j < 5 && !placed; j++) {
          const day = (i + k + j) % 5;
          if (pass === 0 && usedDays.has(day)) continue;
          if ((daily[`${f.id}-${day}`] || 0) + len > MAX_PER_DAY) continue;
          for (let p = 0; p + len <= PERIODS && !placed; p++) {
            if (len > 1 && p < LUNCH_AFTER && p + len > LUNCH_AFTER) continue;
            const slots = Array.from({ length: len }, (_, q) => p + q);
            if (slots.some((q) => busy.has(`f${f.id}-${day}-${q}`) || busy.has(`c${a.class_id}-${day}-${q}`))) continue;
            const v = pool.find((v) => slots.every((q) => !busy.has(`v${v.id}-${day}-${q}`)));
            if (!v) continue;
            slots.forEach((q) => {
              busy.add(`v${v.id}-${day}-${q}`); busy.add(`f${f.id}-${day}-${q}`); busy.add(`c${a.class_id}-${day}-${q}`);
              rows.push({ day, period: q, faculty_id: f.id, subject_id: s.id, venue_id: v.id, class_id: a.class_id });
            });
            hours[f.id] = (hours[f.id] || 0) + len;
            daily[`${f.id}-${day}`] = (daily[`${f.id}-${day}`] || 0) + len;
            usedDays.add(day);
            placed = true;
          }
        }
      }
      if (!placed) issues.push(`No free slot was found for a session of ${s.name}.`);
    }
  });

  const ins = db.prepare('INSERT INTO timetable(day,period,faculty_id,subject_id,venue_id,class_id) VALUES(@day,@period,@faculty_id,@subject_id,@venue_id,@class_id)');
  const del = db.prepare('DELETE FROM timetable WHERE class_id=?');
  db.transaction(() => {
    classIds.forEach((id) => del.run(id));
    rows.forEach((r) => ins.run(r));
    setIssues(semester, issues);
  })();
  return { semester, sessions: rows.length, issues };
}
