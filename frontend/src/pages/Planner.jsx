import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { SEMESTERS } from '../config.js';
import { useData } from '../store.jsx';
import Form from '../components/Form.jsx';
import { Bar, Empty } from '../components/ui.jsx';

const TYPES = [{ value: 'Classroom', label: 'Classroom' }, { value: 'Lab', label: 'Lab' }];

/**
 * Semester planner: everything for one department and one semester on a single screen.
 * Each semester has its own subjects, and each subject gets its own teacher, per section.
 */
export default function Planner() {
  const nav = useNavigate();
  const { departments, classes, faculty, subjects, assignments, run, by } = useData();
  const [deptPick, setDeptPick] = useState(null);
  const [semPick, setSemPick] = useState(null);
  const [newSection, setNewSection] = useState('A');

  if (!departments.length) return <div className="card"><Empty>Add a department in Setup first, then plan its semesters here.</Empty></div>;

  const deptId = departments.some((d) => d.id === deptPick) ? deptPick : departments[0].id;
  const dept = by(departments, deptId);
  const semester = semPick ?? (classes.find((c) => c.department_id === deptId)?.semester ?? 1);

  const sections = classes.filter((c) => c.department_id === deptId && c.semester === semester).sort((a, b) => a.section.localeCompare(b.section));
  const subs = subjects.filter((s) => s.department_id === deptId && s.semester === semester);
  const teacherOf = (classId, subjectId) => assignments.find((a) => a.class_id === classId && a.subject_id === subjectId)?.faculty_id ?? '';

  const setTeacher = (classId, subjectId, value) =>
    run(() => api.post('/planner/assign', { class_id: classId, subject_id: subjectId, faculty_id: value }), 'Saved');
  const setAll = (subjectId, value) =>
    run(async () => { for (const c of sections) await api.post('/planner/assign', { class_id: c.id, subject_id: subjectId, faculty_id: value }); }, 'Saved for all sections');

  const sameForAll = (subjectId) => {
    const ids = sections.map((c) => teacherOf(c.id, subjectId));
    return ids.length && ids.every((x) => x === ids[0]) ? ids[0] : '';
  };

  const teacherSelect = ({ value, onChange, label }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">Not assigned</option>
      <optgroup label={dept.name}>
        {faculty.filter((f) => f.department_id === deptId).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </optgroup>
      {faculty.some((f) => f.department_id !== deptId) && (
        <optgroup label="Other departments">
          {faculty.filter((f) => f.department_id !== deptId).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </optgroup>
      )}
    </select>
  );

  // Hours each teacher carries across ALL semesters, for the teachers used in this semester
  const hoursOf = (fid) => assignments.filter((a) => a.faculty_id === fid).reduce((n, a) => n + (by(subjects, a.subject_id).hours_per_week || 0), 0);
  const usedIds = [...new Set(assignments.filter((a) => sections.some((c) => c.id === a.class_id)).map((a) => a.faculty_id))];

  const unassigned = subs.reduce((n, s) => n + sections.filter((c) => teacherOf(c.id, s.id) === '').length, 0);

  async function generate() {
    const ok = await run(() => api.post('/timetable/generate', { semester }), `Semester ${semester} timetable generated`);
    if (ok) nav('/timetable', { state: { semester } });
  }

  return (
    <>
      <div className="row">
        <label style={{ maxWidth: 280 }}>Department
          <select value={deptId} onChange={(e) => { setDeptPick(Number(e.target.value)); setSemPick(null); }}>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label style={{ maxWidth: 190 }}>Semester
          <select value={semester} onChange={(e) => setSemPick(Number(e.target.value))}>
            {SEMESTERS.map((n) => <option key={n} value={n}>Semester {n}</option>)}
          </select>
        </label>
        <div className="chips" style={{ flex: 2, minWidth: 220 }}>
          <span style={{ background: 'none', padding: 0, color: 'var(--mut)', fontSize: 13 }}>Sections:</span>{' '}
          {sections.map((c) => <span key={c.id}>{c.section}</span>)}
          <form style={{ display: 'inline-flex', gap: 6, verticalAlign: 'middle' }} onSubmit={(e) => {
            e.preventDefault();
            run(() => api.post('/classes', { department_id: deptId, semester, section: newSection.trim().toUpperCase() }), 'Section added');
          }}>
            <input value={newSection} onChange={(e) => setNewSection(e.target.value)} maxLength={3} required aria-label="Section name" style={{ width: 64, margin: 0, padding: '5px 8px' }} />
            <button className="ghost">{sections.length ? 'Add section' : 'Add first section'}</button>
          </form>
        </div>
      </div>

      <div className="plan">
        <div>
          <div className="card">
            <h3>Subjects and teachers: {dept.name}, Semester {semester}</h3>
            {!sections.length ? <Empty>Semester {semester} has no section yet. Add one above (for example A).</Empty>
              : !subs.length ? <Empty>No subjects for this semester yet. Add the first one on the right.</Empty> : (
                <div className="sc"><table className="t">
                  <thead><tr><th>Subject</th><th>Hours</th>{sections.length > 1 && <th>All sections</th>}{sections.map((c) => <th key={c.id}>Section {c.section}</th>)}<th /></tr></thead>
                  <tbody>{subs.map((s) => (
                    <tr key={s.id}>
                      <td><b>{s.name}</b><br /><small className="mut">{s.venue_type}</small></td>
                      <td>{s.hours_per_week} h</td>
                      {sections.length > 1 && <td>{teacherSelect({ value: sameForAll(s.id), onChange: (v) => setAll(s.id, v), label: `${s.name}, all sections` })}</td>}
                      {sections.map((c) => <td key={c.id}>{teacherSelect({ value: teacherOf(c.id, s.id), onChange: (v) => setTeacher(c.id, s.id, v), label: `${s.name}, section ${c.section}` })}</td>)}
                      <td><button className="x" onClick={() => run(() => api.del(`/subjects/${s.id}`), 'Subject removed')}>Remove</button></td>
                    </tr>
                  ))}</tbody>
                </table></div>
              )}
          </div>
          <div className="row">
            <button className="btn" disabled={!subs.length || !sections.length || unassigned > 0} onClick={generate}>Generate semester {semester} timetable</button>
            {unassigned > 0 && <span className="mut">{unassigned} subject{unassigned > 1 ? 's' : ''} still need a teacher</span>}
          </div>
        </div>

        <div>
          <Form title={`Add subject to semester ${semester}`} submit="Add subject"
            onSubmit={(v) => run(() => api.post('/subjects', { ...v, department_id: deptId, semester }), 'Subject added')}
            fields={[{ name: 'name', label: 'Subject name' }, { name: 'venue_type', label: 'Held in', options: TYPES },
              { name: 'hours_per_week', label: 'Hours per week', type: 'number', min: 1, max: 12, default: 3 }]} />
          <Form title={`Add teacher to ${dept.name}`} submit="Add teacher"
            onSubmit={(v) => run(() => api.post('/faculty', { ...v, department_id: deptId }), 'Teacher added')}
            fields={[{ name: 'name', label: 'Teacher name' }, { name: 'weekly_load', label: 'Required load (hours per week)', type: 'number', min: 1, max: 40, default: 25 }]} />
          <div className="card"><h3>Teacher load</h3>
            {usedIds.length ? usedIds.map((id) => {
              const f = by(faculty, id), h = hoursOf(id);
              return <Bar key={id} label={f.name} percent={Math.min(100, Math.round((h / f.weekly_load) * 100))} text={`${h} of ${f.weekly_load} h`} />;
            }) : <Empty>Pick teachers to see their load</Empty>}
            <small className="mut">Counts hours from every semester.</small>
          </div>
        </div>
      </div>
    </>
  );
}
