import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from './db.js';
import { sendResetCode } from './mailer.js';

const SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
if (!process.env.JWT_SECRET) console.warn('JWT_SECRET is not set. Using an insecure development secret.');

const RESET_MINUTES = 15, MAX_ATTEMPTS = 5, RESEND_SECONDS = 60;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const sign = (u) => jwt.sign({ id: u.id, username: u.username }, SECRET, { expiresIn: '8h' });
const fail = (status, message) => Object.assign(new Error(message), { status });
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

function checkPassword(p) {
  if (typeof p !== 'string' || p.length < 8) throw fail(400, 'Password must be at least 8 characters.');
  if (p.length > 72) throw fail(400, 'Password must be 72 characters or fewer.');
}

export function ensureAdmin() {
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASSWORD || 'admin123';
  if (!db.prepare('SELECT 1 FROM users WHERE username=? COLLATE NOCASE').get(user)) {
    db.prepare('INSERT INTO users(username,password_hash,full_name) VALUES(?,?,?)').run(user, bcrypt.hashSync(pass, 10), 'Administrator');
    console.log(`Created admin user "${user}"`);
  }
}

// Accepts a username or an email address
const findUser = (identifier) => {
  const id = String(identifier || '').trim();
  return id ? db.prepare('SELECT * FROM users WHERE username=? COLLATE NOCASE OR email=?').get(id, id.toLowerCase()) : undefined;
};

export function login(identifier, password) {
  const u = findUser(identifier);
  if (!u || !bcrypt.compareSync(String(password || ''), u.password_hash)) return null;
  return sign(u);
}

// Creating an account needs the staff registration code (SIGNUP_CODE in .env),
// so strangers cannot make themselves administrators.
export function register({ name, username, email, password, code }) {
  const need = process.env.SIGNUP_CODE;
  if (!need) throw fail(403, 'Creating accounts is turned off. The administrator must set SIGNUP_CODE on the server.');
  if (!same(code || '', need)) throw fail(403, 'Wrong registration code.');

  name = String(name || '').trim(); username = String(username || '').trim(); email = String(email || '').trim().toLowerCase();
  if (name.length < 2 || name.length > 60) throw fail(400, 'Please enter your full name.');
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) throw fail(400, 'Username must be 3 to 30 letters, numbers, dots, dashes or underscores.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400, 'Please enter a valid email address.');
  checkPassword(password);
  if (db.prepare('SELECT 1 FROM users WHERE username=? COLLATE NOCASE').get(username)) throw fail(409, 'That username is already taken.');
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) throw fail(409, 'That email is already registered.');

  const info = db.prepare('INSERT INTO users(username,password_hash,email,full_name) VALUES(?,?,?,?)').run(username, bcrypt.hashSync(password, 10), email, name);
  return sign({ id: Number(info.lastInsertRowid), username });
}

// Step 1 of a reset: create a 6-digit code and send it. Never reveals whether the account exists.
export async function startReset(identifier) {
  const u = findUser(identifier);
  if (!u) return;
  const now = Math.floor(Date.now() / 1000);
  const old = db.prepare('SELECT created_at FROM password_resets WHERE user_id=?').get(u.id);
  if (old && now - old.created_at < RESEND_SECONDS) return;   // limit spamming
  const code = String(crypto.randomInt(100000, 1000000));
  db.prepare(`INSERT INTO password_resets(user_id,code_hash,expires_at,created_at,attempts) VALUES(?,?,?,?,0)
    ON CONFLICT(user_id) DO UPDATE SET code_hash=excluded.code_hash, expires_at=excluded.expires_at, created_at=excluded.created_at, attempts=0`)
    .run(u.id, sha(code), now + RESET_MINUTES * 60, now);
  try { await sendResetCode(u.email, u.username, code); } catch (e) { console.error('Could not send reset email:', e.message); }
}

// Step 2: check the code (single use, expires, limited attempts) and set the new password.
export function finishReset({ identifier, code, password }) {
  checkPassword(password);
  const bad = fail(400, 'That code is wrong or has expired. Ask for a new one.');
  const u = findUser(identifier);
  const row = u && db.prepare('SELECT * FROM password_resets WHERE user_id=?').get(u.id);
  if (!row) throw bad;
  if (row.expires_at < Math.floor(Date.now() / 1000) || row.attempts >= MAX_ATTEMPTS) {
    db.prepare('DELETE FROM password_resets WHERE user_id=?').run(u.id);
    throw bad;
  }
  if (!same(sha(String(code || '').trim()), row.code_hash)) {
    db.prepare('UPDATE password_resets SET attempts=attempts+1 WHERE user_id=?').run(u.id);
    throw bad;
  }
  db.transaction(() => {
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(password, 10), u.id);
    db.prepare('DELETE FROM password_resets WHERE user_id=?').run(u.id);
  })();
}

export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  try {
    req.user = jwt.verify(h.startsWith('Bearer ') ? h.slice(7) : '', SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Please sign in again' });
  }
}
