import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { auth } from '../api.js';
import { COLLEGE_NAME } from '../config.js';

const NAV = [
  ['/', 'Dashboard'], ['/setup', 'Setup'], ['/planner', 'Semester planner'], ['/assign', 'Assign teaching'], ['/timetable', 'Timetable'],
  ['/availability', 'Live availability'], ['/booking', 'Lab booking'], ['/reports', 'Workload reports'],
];

export default function Layout() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(t); }, []);
  const title = NAV.find(([p]) => p === pathname)?.[1] || '';

  return (
    <div className="shell">
      <aside>
        <div className="brand">Timetable<br /><b>Desk</b><small>{COLLEGE_NAME}</small></div>
        {NAV.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}
        <button className="out" onClick={() => { auth.clear(); nav('/login'); }}>Sign out</button>
      </aside>
      <main>
        <div className="top">
          <h1>{title}</h1>
          <span className="clock">{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}, {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
