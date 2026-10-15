import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const TIMES = ['9:00', '10:00', '11:00', '12:00', '1:30', '2:30', '3:30', '4:30'];

const empty = { departments: [], classes: [], faculty: [], subjects: [], venues: [], assignments: [], bookings: [], entries: [], issues: {} };
const Ctx = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(empty);
  const [toast, setToast] = useState(null);

  const reload = useCallback(async () => {
    const [departments, classes, faculty, subjects, venues, assignments, bookings, tt] = await Promise.all(
      ['/departments', '/classes', '/faculty', '/subjects', '/venues', '/assignments', '/bookings', '/timetable'].map(api.get));
    setData({ departments, classes, faculty, subjects, venues, assignments, bookings, entries: tt.entries, issues: tt.issues });
  }, []);

  useEffect(() => { reload().catch(() => {}); }, [reload]);

  const notify = useCallback((message, bad = false) => {
    const key = Date.now();
    setToast({ message, bad, key });
    setTimeout(() => setToast((t) => (t && t.key === key ? null : t)), 2600);
  }, []);

  // Run an API action, then refresh everything. Errors become a toast.
  const run = useCallback(async (fn, okMessage) => {
    try { const r = await fn(); await reload(); if (okMessage) notify(okMessage); return r ?? true; }
    catch (e) { notify(e.message, true); return null; }
  }, [reload, notify]);

  const by = (list, id) => list.find((x) => x.id === id) || {};
  // "Computer Science, Sem 3 - A"
  const cname = (id) => {
    const c = data.classes.find((x) => x.id === id);
    return c ? `${by(data.departments, c.department_id).name}, Sem ${c.semester} - ${c.section}` : '';
  };
  return (
    <Ctx.Provider value={{ ...data, reload, notify, run, by, cname }}>
      {children}
      {toast && <div className={`toast ${toast.bad ? 'bad' : ''}`} role="status">{toast.message}</div>}
    </Ctx.Provider>
  );
}
export const useData = () => useContext(Ctx);
