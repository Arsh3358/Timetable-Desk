import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, openPdf } from '../api.js';
import { SEMESTERS } from '../config.js';
import { useData } from '../store.jsx';
import Grid from '../components/Grid.jsx';
import { Empty } from '../components/ui.jsx';

const MODES = [['cls', 'By class'], ['fac', 'By teacher'], ['ven', 'By venue']];

export default function Timetable() {
  const { classes, faculty, venues, entries, issues, run, notify, cname } = useData();
  const location = useLocation();
  const [semPick, setSemPick] = useState(location.state?.semester ?? null);
  const [mode, setMode] = useState('cls');
  const [pick, setPick] = useState(null);

  // Default to the lowest semester that has classes
  const semester = semPick ?? (classes.length ? Math.min(...classes.map((c) => c.semester)) : 1);
  const inSem = classes.filter((c) => c.semester === semester);
  const hasSessions = entries.some((e) => inSem.some((c) => c.id === e.class_id));

  const list = mode === 'cls' ? inSem.map((c) => ({ id: c.id, name: cname(c.id) })) : mode === 'fac' ? faculty : venues;
  const id = list.some((x) => x.id === pick) ? pick : list[0]?.id;
  const notes = issues[semester] || [];

  return (
    <>
      <div className="row">
        <label style={{ maxWidth: 190 }}>Semester
          <select value={semester} onChange={(e) => { setSemPick(Number(e.target.value)); setPick(null); }}>
            {SEMESTERS.map((n) => <option key={n} value={n}>Semester {n}{classes.some((c) => c.semester === n) ? '' : ' (no classes)'}</option>)}
          </select>
        </label>
        <button className="btn" disabled={!inSem.length}
          onClick={() => run(() => api.post('/timetable/generate', { semester }), `Semester ${semester} timetable generated`)}>
          {hasSessions ? `Regenerate semester ${semester}` : `Generate semester ${semester}`}
        </button>
        <button className="ghost" onClick={() => openPdf(mode, { semester }).catch((e) => notify(e.message, true))}>Export PDF</button>
      </div>
      <div className="row">
        <div className="tabs" style={{ margin: 0 }}>
          {MODES.map(([k, l]) => <button key={k} className={mode === k ? 'on' : ''} onClick={() => { setMode(k); setPick(null); }}>{l}</button>)}
        </div>
        <label style={{ maxWidth: 340 }}>
          <select value={id ?? ''} onChange={(e) => setPick(Number(e.target.value))} aria-label="Choose">
            {list.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
      </div>
      {notes.length > 0 && <div className="issues"><b>Please review (semester {semester})</b>{notes.map((t, i) => <p key={i}>{t}</p>)}</div>}
      <div className="card">
        {!inSem.length && mode === 'cls' ? <Empty>No classes in semester {semester} yet. Add them under Setup, then Classes.</Empty>
          : id == null ? <Empty>Add data in Setup first.</Empty>
          : mode === 'cls' && !hasSessions ? <Empty>No timetable for semester {semester} yet. Assign teachers to subjects, then generate.</Empty>
          : <Grid mode={mode} id={id} />}
      </div>
    </>
  );
}
