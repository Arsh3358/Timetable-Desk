import { api } from '../api.js';
import { DAYS, TIMES, useData } from '../store.jsx';
import Form from '../components/Form.jsx';
import { Empty, Remove, Table } from '../components/ui.jsx';

export default function Booking() {
  const { venues, faculty, bookings, run, by } = useData();
  if (!venues.length || !faculty.length) return <div className="card"><Empty>Add venues and teachers in Setup to start booking.</Empty></div>;

  const fields = [
    { name: 'venue_id', label: 'Venue', options: venues.map((v) => ({ value: v.id, label: `${v.name} (${v.type})` })) },
    { name: 'faculty_id', label: 'Teacher', options: faculty.map((f) => ({ value: f.id, label: f.name })) },
    { name: 'day', label: 'Day', options: DAYS.map((d, i) => ({ value: i, label: d })) },
    { name: 'period', label: 'Starting period', options: TIMES.map((t, i) => ({ value: i, label: `P${i + 1} (${t})` })) },
    { name: 'length', label: 'Periods', options: [1, 2, 3].map((n) => ({ value: n, label: String(n) })) },
    { name: 'purpose', label: 'Purpose', placeholder: 'Extra practical, makeup class', required: false },
  ];

  return (
    <div className="two">
      <Form title="Book a lab or room" submit="Check and book" fields={fields} onSubmit={(v) => run(() => api.post('/bookings', v), 'Venue booked')} />
      <div className="card"><h3>Bookings</h3>
        {bookings.length ? <Table heads={['Venue', 'Day', 'Period', 'Teacher', 'Purpose']} rows={bookings.map((b) =>
          <tr key={b.id}><td>{by(venues, b.venue_id).name}</td><td>{DAYS[b.day]}</td><td>P{b.period + 1}</td><td>{by(faculty, b.faculty_id).name}</td><td>{b.purpose}</td>
            <Remove onClick={() => run(() => api.del(`/bookings/${b.id}`), 'Booking cancelled')}>Cancel</Remove></tr>)} /> : <Empty>No extra bookings yet</Empty>}
      </div>
    </div>
  );
}
