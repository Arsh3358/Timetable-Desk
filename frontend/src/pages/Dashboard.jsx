import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useData } from '../store.jsx';
import { Bar, CountUp, Empty } from '../components/ui.jsx';
import { COLLEGE_IMAGE, COLLEGE_NAME } from '../config.js';

export default function Dashboard() {
  const { entries, departments, bookings } = useData();
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/dashboard').then(setD).catch(() => {}); }, [entries, bookings]);
  if (!d) return null;

  const stats = [['Departments', d.totals.departments], ['Classes', d.totals.classes], ['Faculty', d.totals.faculty], ['Venues', d.totals.venues],
    ['Sessions scheduled', d.totals.sessions], ['Conflicts', d.totals.conflicts]];

  return (
    <>
      <div className="hero" style={{ backgroundImage: `url(${COLLEGE_IMAGE})` }}>
        <div><h2>{COLLEGE_NAME}</h2><p>{d.totals.sessions} sessions scheduled this week</p></div>
      </div>
      {!departments.length && <div className="card"><Empty>Nothing here yet. Start in <Link to="/setup">Setup</Link> with your departments, teachers, subjects and venues.</Empty></div>}
      <div className="stats">
        {stats.map(([label, n]) => (
          <div key={label} className={`stat ${label === 'Conflicts' && n ? 'bad' : ''}`}><b><CountUp to={n} /></b><span>{label}</span></div>
        ))}
      </div>
      <div className="cols">
        <div className="card"><h3>Semesters</h3>
          {d.semesters.map((s) => <Bar key={s.semester} label={`Semester ${s.semester}`} percent={Math.min(100, Math.round((s.sessions / Math.max(1, s.classes * 30)) * 100))} text={`${s.classes} ${s.classes === 1 ? 'class' : 'classes'}, ${s.sessions} sessions`} />)}
          {!d.semesters.length && <Empty>No classes yet</Empty>}
        </div>
        <div className="card"><h3>Venue utilisation</h3>
          {d.venues.map((v) => <Bar key={v.id} label={`${v.name} (${v.type})`} percent={Math.round((v.used / d.weekSlots) * 100)} text={`${v.used} of ${d.weekSlots} slots`} />)}
          {!d.venues.length && <Empty>No venues yet</Empty>}
        </div>
        <div className="card"><h3>Faculty workload</h3>
          {d.faculty.map((f) => <Bar key={f.id} label={f.name} percent={Math.min(100, Math.round((f.scheduled / f.weekly_load) * 100))} text={`${f.scheduled} of ${f.weekly_load} h`} />)}
          {!d.faculty.length && <Empty>No faculty yet</Empty>}
        </div>
      </div>
    </>
  );
}
