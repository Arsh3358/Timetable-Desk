import { api } from '../api.js';
import { useData } from '../store.jsx';
import Form from '../components/Form.jsx';
import { Empty, Remove, Table } from '../components/ui.jsx';

export default function Assign() {
  const { classes, faculty, subjects, venues, departments, assignments, run, by, cname } = useData();
  if (!classes.length || !faculty.length || !subjects.length)
    return <div className="card"><Empty>Add at least one class, teacher and subject in Setup, then match them here.</Empty></div>;

  const fields = [
    { name: 'class_id', label: 'Class', options: classes.map((c) => ({ value: c.id, label: cname(c.id) })) },
    // Only subjects of the chosen class's department and semester are offered
    { name: 'subject_id', label: 'Subject', options: (cur) => {
      const c = by(classes, Number(cur.class_id));
      const list = subjects.filter((s) => s.department_id === c.department_id && s.semester === c.semester).map((s) => ({ value: s.id, label: `${s.name} (${s.hours_per_week} h)` }));
      return list.length ? list : [{ value: '', label: 'No subjects for this class yet' }];
    } },
    { name: 'faculty_id', label: 'Teacher', options: faculty.map((f) => ({ value: f.id, label: `${f.name} (${by(departments, f.department_id).name})` })) },
    { name: 'venue_id', label: 'Venue', options: [{ value: '', label: 'Choose automatically' }, ...venues.map((v) => ({ value: v.id, label: `${v.name} (${v.type})` }))] },
  ];

  return (
    <div className="two">
      <Form title="Who teaches what" submit="Assign" fields={fields} onSubmit={(v) => run(() => api.post('/assignments', v), 'Assigned')} />
      <div className="card"><h3>Teaching assignments</h3>
        {assignments.length ? <Table heads={['Class', 'Subject', 'Teacher', 'Venue', 'Hours']} rows={[...assignments].sort((a, b) => by(classes, a.class_id).semester - by(classes, b.class_id).semester).map((a) => {
          const s = by(subjects, a.subject_id);
          return <tr key={a.id}><td>{cname(a.class_id)}</td><td>{s.name}</td><td>{by(faculty, a.faculty_id).name}</td><td>{a.venue_id ? by(venues, a.venue_id).name : 'Auto'}</td><td>{s.hours_per_week} h</td>
            <Remove onClick={() => run(() => api.del(`/assignments/${a.id}`), 'Removed')} /></tr>;
        })} /> : <Empty>No assignments yet</Empty>}
      </div>
    </div>
  );
}
