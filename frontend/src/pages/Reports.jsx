import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useData } from '../store.jsx';
import { Empty } from '../components/ui.jsx';

function Status({ required, assigned }) {
  const d = assigned - required;
  if (d === 0) return <span className="pill p-ok">Matched</span>;
  return d < 0 ? <span className="pill p-w">{-d} h short</span> : <span className="pill p-b">{d} h over</span>;
}

export default function Reports() {
  const { entries, bookings, assignments } = useData();
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get('/reports/workload').then(setRows).catch(() => {}); }, [entries, bookings, assignments]);
  if (!rows) return null;
  if (!rows.length) return <div className="card"><Empty>Add faculty to see workload reports.</Empty></div>;

  return (
    <>
      <div className="row noprint"><button className="ghost" onClick={() => window.print()}>Print or save as PDF</button></div>
      <div className="card"><h3>Required load vs assigned and scheduled hours</h3>
        <div className="sc"><table className="t">
          <thead><tr><th>Teacher</th><th>Department</th><th>Required h</th><th>Assigned h</th><th>Scheduled h</th><th>Booked h</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}><td>{r.name}</td><td>{r.department}</td><td>{r.required}</td><td>{r.assigned}</td><td>{r.scheduled}</td><td>{r.booked}</td><td><Status required={r.required} assigned={r.assigned} /></td></tr>
          ))}</tbody>
        </table></div>
      </div>
    </>
  );
}
