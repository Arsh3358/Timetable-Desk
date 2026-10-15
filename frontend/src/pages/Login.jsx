import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api, auth } from '../api.js';
import { COLLEGE_IMAGE, COLLEGE_NAME } from '../config.js';

const TITLES = { login: COLLEGE_NAME, register: 'Create a new account', forgot: 'Forgot your password?', reset: 'Set a new password' };

function Field({ label, value, onChange, type = 'text', ...rest }) {
  return <label>{label}<input type={type} value={value ?? ''} onChange={onChange} required {...rest} /></label>;
}
const Link = ({ onClick, children }) => <button type="button" className="link" onClick={onClick}>{children}</button>;

/**
 * One card, four screens: sign in, create account, forgot password, reset password.
 * The server decides who may create an account (staff registration code).
 */
export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({});
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [tries, setTries] = useState(0);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  // 40 cells that light up at random, like periods filling in a timetable
  const cells = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ h: (i * 47) % 360, delay: -(Math.random() * 7).toFixed(2) })), []);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const go = (next, { fields = {}, message = '' } = {}) => { setMode(next); setF(fields); setError(''); setInfo(message); setShow(false); };

  function checkNewPassword() {
    if ((f.password || '').length < 8) throw new Error('Password must be at least 8 characters.');
    if (f.password !== f.confirm) throw new Error('The two passwords do not match.');
  }
  const finish = ({ token }) => { auth.set(token); nav('/', { replace: true }); };

  async function submit(e) {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'login') finish(await api.post('/auth/login', { identifier: f.identifier, password: f.password }));
      else if (mode === 'register') {
        checkNewPassword();
        finish(await api.post('/auth/register', { name: f.name, username: f.username, email: f.email, password: f.password, code: f.code }));
      } else if (mode === 'forgot') {
        const r = await api.post('/auth/forgot', { identifier: f.identifier });
        go('reset', { fields: { identifier: f.identifier }, message: r.message });
      } else {
        checkNewPassword();
        await api.post('/auth/reset', { identifier: f.identifier, code: f.code, password: f.password });
        go('login', { fields: { identifier: f.identifier }, message: 'Password changed. You can sign in now.' });
      }
    } catch (err) {
      setError(err.message); setTries((n) => n + 1);
    } finally { setBusy(false); }
  }

  const pw = show ? 'text' : 'password';
  const showToggle = (
    <label className="chk"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password</label>
  );

  return (
    <div className="login">
      <div className="bg">{cells.map((c, i) => <i key={i} style={{ '--h': c.h, animationDelay: `${c.delay}s` }} />)}</div>
      <AnimatePresence mode="wait">
        <motion.form className="lc" onSubmit={submit} key={`${mode}-${tries}`}
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0, x: tries ? [0, -8, 8, -8, 0] : 0 }} exit={{ opacity: 0 }}
          transition={{ duration: tries ? 0.4 : 0.35, ease: 'easeOut' }}>
          <div className="photo" style={{ backgroundImage: `url(${COLLEGE_IMAGE})` }} role="img" aria-label={`${COLLEGE_NAME} campus`} />
          <h1>Timetable <span>Desk</span></h1>
          <p>{TITLES[mode]}</p>

          {mode === 'login' && <>
            <Field label="Username or email" value={f.identifier} onChange={set('identifier')} autoFocus autoComplete="username" />
            <Field label="Password" type={pw} value={f.password} onChange={set('password')} autoComplete="current-password" />
            {showToggle}
          </>}

          {mode === 'register' && <>
            <Field label="Full name" value={f.name} onChange={set('name')} autoFocus autoComplete="name" />
            <Field label="Username" value={f.username} onChange={set('username')} autoComplete="username" />
            <Field label="Email" type="email" value={f.email} onChange={set('email')} autoComplete="email" />
            <Field label="Password (8 or more characters)" type={pw} value={f.password} onChange={set('password')} autoComplete="new-password" />
            <Field label="Confirm password" type={pw} value={f.confirm} onChange={set('confirm')} autoComplete="new-password" />
            <Field label="Staff registration code" value={f.code} onChange={set('code')} />
            {showToggle}
            <div className="hint">Ask your administrator for the registration code.</div>
          </>}

          {mode === 'forgot' && <>
            <Field label="Username or email" value={f.identifier} onChange={set('identifier')} autoFocus />
            <div className="hint">We send a 6-digit code to the email on the account. If email is not set up on the server, the code appears in the server terminal.</div>
          </>}

          {mode === 'reset' && <>
            <Field label="Username or email" value={f.identifier} onChange={set('identifier')} autoComplete="username" />
            <Field label="6-digit code" value={f.code} onChange={set('code')} inputMode="numeric" maxLength={6} autoFocus autoComplete="one-time-code" />
            <Field label="New password (8 or more characters)" type={pw} value={f.password} onChange={set('password')} autoComplete="new-password" />
            <Field label="Confirm new password" type={pw} value={f.confirm} onChange={set('confirm')} autoComplete="new-password" />
            {showToggle}
          </>}

          <button className="btn w" disabled={busy}>
            {busy ? 'Please wait...' : { login: 'Sign in', register: 'Create account', forgot: 'Send reset code', reset: 'Set new password' }[mode]}
          </button>
          <div className="err" role="alert">{error}</div>
          {info && <div className="okmsg" role="status">{info}</div>}

          <div className="links">
            {mode === 'login' && <><Link onClick={() => go('forgot', { fields: { identifier: f.identifier } })}>Forgot password?</Link><Link onClick={() => go('register')}>Create new account</Link></>}
            {mode === 'register' && <Link onClick={() => go('login')}>Already have an account? Sign in</Link>}
            {mode === 'forgot' && <><Link onClick={() => go('reset', { fields: { identifier: f.identifier } })}>I already have a code</Link><Link onClick={() => go('login')}>Back to sign in</Link></>}
            {mode === 'reset' && <><Link onClick={() => go('forgot', { fields: { identifier: f.identifier } })}>Send a new code</Link><Link onClick={() => go('login')}>Back to sign in</Link></>}
          </div>
        </motion.form>
      </AnimatePresence>
    </div>
  );
}
