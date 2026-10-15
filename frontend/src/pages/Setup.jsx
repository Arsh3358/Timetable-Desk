import { useState } from 'react';
import { api } from '../api.js';
import { SEMESTERS } from '../config.js';
import { useData } from '../store.jsx';
import Form from '../components/Form.jsx';
import { Empty, Remove, Table } from '../components/ui.jsx';

const TABS = [['dept', 'Departments'], ['cls', 'Classes'], ['fac', 'Faculty'], ['sub', 'Subjects'], ['ven', 'Venues']];
const TYPES = [{ value: 'Classroom', label: 'Classroom' }, { value: 'Lab', label: 'Lab' }];
const SEM_OPTS = SEMESTERS.map((n) => ({ value: n, label: `Semester ${n}` }));

export default function Setup() {
  const [tab, setTab] = useState('dept');
  const { departments, classes, faculty, subjects, venues, run, by } = useData();
  const deptOpts = departments.map((d) => ({ value: d.id, label: d.name }));
  const add = (path, label, fix) => (v) => run(() => api.post(path, fix ? fix(v) : v), `${label} added`);
  const remove = (path, id) => run(() => api.del(`${path}/${id}`), 'Removed');
  const needDept = <div className="card"><Empty>Add a department first.<br /><button className="btn" onClick={() => setTab('dept')}>Add department</button></Empty></div>;

  return (
    <>
      <p className="mut" style={{ marginTop: 0 }}>Tip: the Semester planner lets you add a semester's subjects and teachers and assign them in one place.</p>
      <div className="tabs">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === 'dept' && <div className="two">
        <Form title="New department" submit="Add department" onSubmit={add('/departments', 'Department')}
          fields={[{ name: 'name', label: 'Department name' }, { name: 'teacher_count', label: 'Number of teachers', type: 'number', min: 1, default: 3 }]} />
        <div className="card"><h3>Departments</h3>
          {departments.length ? <Table heads={['Name', 'Teachers added']} rows={departments.map((d) => {
            const n = faculty.filter((f) => f.department_id === d.id).length;
            return <tr key={d.id}><td>{d.name}</td><td><span className={`pill ${n >= d.teacher_count ? 'p-ok' : 'p-w'}`}>{n} of {d.teacher_count}</span></td><Remove onClick={() => remove('/departments', d.id)} /></tr>;
          })} /> : <Empty>No departments yet</Empty>}
        </div>
      </div>}

      {tab === 'cls' && (!departments.length ? needDept : <div className="two">
        <Form title="New class" submit="Add class" onSubmit={add('/classes', 'Class', (v) => ({ ...v, section: v.section.toUpperCase() }))}
          fields={[{ name: 'department_id', label: 'Department', options: deptOpts }, { name: 'semester', label: 'Semester', options: SEM_OPTS },
            { name: 'section', label: 'Section', default: 'A', placeholder: 'A, B, C' }]} />
        <div className="card"><h3>Classes</h3>
          {classes.length ? <Table heads={['Department', 'Semester', 'Section']} rows={[...classes].sort((a, b) => a.semester - b.semester || a.department_id - b.department_id || a.section.localeCompare(b.section)).map((c) =>
            <tr key={c.id}><td>{by(departments, c.department_id).name}</td><td>{c.semester}</td><td>{c.section}</td><Remove onClick={() => remove('/classes', c.id)} /></tr>)} /> : <Empty>No classes yet. A class is one department, one semester and one section.</Empty>}
        </div>
      </div>)}

      {tab === 'fac' && (!departments.length ? needDept : <div className="two">
        <Form title="New teacher" submit="Add teacher" onSubmit={add('/faculty', 'Teacher')}
          fields={[{ name: 'name', label: 'Teacher name' }, { name: 'department_id', label: 'Department', options: deptOpts },
            { name: 'weekly_load', label: 'Required teaching load (hours per week)', type: 'number', min: 1, max: 40, default: 25 }]} />
        <div className="card"><h3>Faculty</h3>
          {faculty.length ? <Table heads={['Name', 'Department', 'Weekly load']} rows={faculty.map((f) =>
            <tr key={f.id}><td>{f.name}</td><td>{by(departments, f.department_id).name}</td><td>{f.weekly_load} h</td><Remove onClick={() => remove('/faculty', f.id)} /></tr>)} /> : <Empty>No teachers yet</Empty>}
        </div>
      </div>)}

      {tab === 'sub' && (!departments.length ? needDept : <div className="two">
        <Form title="New subject" submit="Add subject" onSubmit={add('/subjects', 'Subject')}
          fields={[{ name: 'name', label: 'Subject name' }, { name: 'department_id', label: 'Department', options: deptOpts },
            { name: 'semester', label: 'Semester', options: SEM_OPTS }, { name: 'venue_type', label: 'Held in', options: TYPES },
            { name: 'hours_per_week', label: 'Hours per week', type: 'number', min: 1, max: 12, default: 3 }]} />
        <div className="card"><h3>Subjects</h3>
          {subjects.length ? <Table heads={['Subject', 'Department', 'Semester', 'Held in', 'Hours']} rows={[...subjects].sort((a, b) => a.semester - b.semester).map((s) =>
            <tr key={s.id}><td>{s.name}</td><td>{by(departments, s.department_id).name}</td><td>{s.semester}</td><td>{s.venue_type}</td><td>{s.hours_per_week} h</td><Remove onClick={() => remove('/subjects', s.id)} /></tr>)} /> : <Empty>No subjects yet</Empty>}
        </div>
      </div>)}

      {tab === 'ven' && <div className="two">
        <Form title="New venue" submit="Add venue" onSubmit={add('/venues', 'Venue')}
          fields={[{ name: 'name', label: 'Venue name' }, { name: 'type', label: 'Type', options: TYPES }, { name: 'capacity', label: 'Capacity (seats)', type: 'number', min: 1, default: 60 }]} />
        <div className="card"><h3>Venues</h3>
          {venues.length ? <Table heads={['Name', 'Type', 'Seats']} rows={venues.map((v) =>
            <tr key={v.id}><td>{v.name}</td><td>{v.type}</td><td>{v.capacity}</td><Remove onClick={() => remove('/venues', v.id)} /></tr>)} /> : <Empty>No venues yet</Empty>}
        </div>
      </div>}
    </>
  );
}
