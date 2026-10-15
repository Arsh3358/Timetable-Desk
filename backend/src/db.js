import Database from 'better-sqlite3';

const db = new Database(process.env.DB_FILE || 'data.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Upgrade from the first version (no classes or semesters): rebuild the tables that changed.
// Departments, faculty, venues and bookings are kept; subjects, assignments and timetable are reset.
const hasTable = (t) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t);
if (hasTable('timetable') && !db.prepare('PRAGMA table_info(timetable)').all().some((c) => c.name === 'class_id')) {
  db.exec('DROP TABLE timetable; DROP TABLE assignments; DROP TABLE subjects;');
  console.log('Upgraded database: subjects, assignments and timetable were reset for semester support.');
}

// Unique indexes make double-booking impossible at the database level:
// a teacher, a class or a room can appear only once per (day, period).
db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS departments(
  id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL,
  teacher_count INTEGER NOT NULL CHECK(teacher_count > 0));
CREATE TABLE IF NOT EXISTS classes(
  id INTEGER PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL CHECK(semester BETWEEN 1 AND 8),
  section TEXT NOT NULL,
  UNIQUE(department_id, semester, section));
CREATE TABLE IF NOT EXISTS faculty(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  weekly_load INTEGER NOT NULL CHECK(weekly_load BETWEEN 1 AND 40));
CREATE TABLE IF NOT EXISTS subjects(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL CHECK(semester BETWEEN 1 AND 8),
  hours_per_week INTEGER NOT NULL CHECK(hours_per_week BETWEEN 1 AND 12),
  venue_type TEXT NOT NULL CHECK(venue_type IN ('Classroom','Lab')));
CREATE TABLE IF NOT EXISTS venues(
  id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('Classroom','Lab')),
  capacity INTEGER NOT NULL CHECK(capacity > 0));
CREATE TABLE IF NOT EXISTS assignments(
  id INTEGER PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  faculty_id INTEGER NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  venue_id INTEGER REFERENCES venues(id) ON DELETE SET NULL,
  UNIQUE(class_id, subject_id));
CREATE TABLE IF NOT EXISTS timetable(
  id INTEGER PRIMARY KEY,
  day INTEGER NOT NULL CHECK(day BETWEEN 0 AND 4),
  period INTEGER NOT NULL CHECK(period BETWEEN 0 AND 7),
  faculty_id INTEGER NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE);
CREATE UNIQUE INDEX IF NOT EXISTS ux_tt_venue ON timetable(day, period, venue_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_tt_faculty ON timetable(day, period, faculty_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_tt_class ON timetable(day, period, class_id);
CREATE TABLE IF NOT EXISTS bookings(
  id INTEGER PRIMARY KEY,
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  faculty_id INTEGER NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  day INTEGER NOT NULL CHECK(day BETWEEN 0 AND 4),
  period INTEGER NOT NULL CHECK(period BETWEEN 0 AND 7),
  purpose TEXT NOT NULL DEFAULT 'Lab session');
CREATE UNIQUE INDEX IF NOT EXISTS ux_bk_venue ON bookings(day, period, venue_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_bk_faculty ON bookings(day, period, faculty_id);
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

// Account fields and password-reset codes (added after the first version)
if (!db.prepare('PRAGMA table_info(users)').all().some((c) => c.name === 'email')) {
  db.exec('ALTER TABLE users ADD COLUMN email TEXT; ALTER TABLE users ADD COLUMN full_name TEXT;');
}
db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email ON users(email) WHERE email IS NOT NULL;
CREATE TABLE IF NOT EXISTS password_resets(
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0);
`);

// Scheduling notes are stored per semester, e.g. key "issues:3"
export const getIssues = () => {
  const out = {};
  db.prepare("SELECT key, value FROM meta WHERE key LIKE 'issues:%'").all()
    .forEach((r) => { out[r.key.split(':')[1]] = JSON.parse(r.value); });
  return out;
};
export const setIssues = (semester, list) =>
  db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(`issues:${semester}`, JSON.stringify(list));

export default db;
