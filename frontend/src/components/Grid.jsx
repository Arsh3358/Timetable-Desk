import { Fragment } from 'react';
import { DAYS, TIMES, useData } from '../store.jsx';

const hue = (id) => (Number(id) * 67) % 360;

/**
 * Weekly timetable grid.
 * mode: 'cls' (one class) | 'fac' (one teacher, all semesters) | 'ven' (one venue, all semesters).
 * Extra bookings also appear for teachers and venues.
 */
export default function Grid({ mode, id }) {
  const { entries, bookings, subjects, faculty, venues, by, cname } = useData();
  const key = { cls: 'class_id', fac: 'faculty_id', ven: 'venue_id' }[mode];

  const cell = (d, p) => {
    const e = entries.find((x) => x.day === d && x.period === p && x[key] === id);
    if (e) {
      const second = mode === 'cls' ? `${by(faculty, e.faculty_id).name} / ${by(venues, e.venue_id).name}`
        : mode === 'fac' ? `${cname(e.class_id)} / ${by(venues, e.venue_id).name}`
        : `${by(faculty, e.faculty_id).name} / ${cname(e.class_id)}`;
      return <div className="c" style={{ '--h': hue(e.subject_id) }}><b>{by(subjects, e.subject_id).name}</b><br />{second}</div>;
    }
    const b = mode !== 'cls' && bookings.find((x) => x.day === d && x.period === p && (mode === 'ven' ? x.venue_id : x.faculty_id) === id);
    return b ? <div className="c" style={{ '--h': 40 }}><b>Booked</b><br />{b.purpose} / {mode === 'ven' ? by(faculty, b.faculty_id).name : by(venues, b.venue_id).name}</div> : null;
  };

  return (
    <div className="sc">
      <table className="g">
        <thead>
          <tr>
            <th className="d" />
            {TIMES.map((t, i) => (
              <Fragment key={t}><th>P{i + 1}<br />{t}</th>{i === 3 && <th className="lu" />}</Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day, di) => (
            <tr key={day}>
              <th className="d">{day}</th>
              {TIMES.map((t, p) => (
                <Fragment key={t}>
                  <td>{cell(di, p)}</td>
                  {p === 3 && di === 0 && <td className="lu" rowSpan={5}><span>Lunch break</span></td>}
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
