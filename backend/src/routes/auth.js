import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { finishReset, login, register, startReset } from '../auth.js';

const router = Router();
const limit = (max) => rateLimit({
  windowMs: 15 * 60 * 1000, limit: max, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});
const wrap = (fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (e) { res.status(e.status || 500).json({ error: e.status ? e.message : 'Something went wrong on the server.' }); }
};

router.post('/login', limit(30), wrap((req, res) => {
  const token = login(req.body?.identifier ?? req.body?.username, req.body?.password);
  if (!token) return res.status(401).json({ error: 'Wrong username or password.' });
  res.json({ token });
}));

router.post('/register', limit(10), wrap((req, res) => {
  res.status(201).json({ token: register(req.body || {}) });
}));

router.post('/forgot', limit(10), wrap(async (req, res) => {
  await startReset(req.body?.identifier);
  res.json({ ok: true, message: 'If an account matches, a 6-digit code has been sent. It is valid for 15 minutes.' });
}));

router.post('/reset', limit(15), wrap((req, res) => {
  finishReset(req.body || {});
  res.json({ ok: true });
}));

export default router;
