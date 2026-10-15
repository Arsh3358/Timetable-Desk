import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { DAYS, TIMES, useData } from '../store.jsx';
import { Empty } from '../components/ui.jsx';

// Maps the current clock time to the period that is running now
function nowSlot() {
  const n = new Date(), m = n.getHours() * 60 + n.getMinutes();
  const starts = [540, 600, 660, 720, 810, 870, 930, 990];
  return { day: Math.min(Math.max(n.getDay() - 1, 0), 4), period: starts.reduce((p, s, i) => (m >= s ? i : p), 0) };
}

export default function Availability() {
  const { entries, bookings } = useData();
  const [slot, setSlot] = useState(nowSlot);
  const [data, setData] = useState(null);

  // Refresh when the slot changes, when data changes, and every 30 seconds
  useEffect(() => {
    let live = true;
    const load = () => api.get(`/availability?day=${slot.day}&period=${slot.period}`).then((d) => live && setData(d)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => { live = false; clearInterval(t); };
  }, [slot, entries, bookings]);

  return (
    <>
      <div className="row">
        <label>Day<select value={slot.day} onChange={(e) => setSlot({ ...slot, day: +e.target.value })}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>
        <label>Period<select value={slot.period} onChange={(e) => setSlot({ ...slot, period: +e.target.value })}>{TIMES.map((t, i) => <option key={t} value={i}>P{i + 1} ({t})</option>)}</select></label>
        <button className="ghost" onClick={() => setSlot(nowSlot())}>Jump to now</button>
      </div>
      {!data ? null : !data.venues.length ? <Empty>Add venues in Setup to see availability.</Empty> : (
        <>
          <div className="rooms">
            {data.venues.map((v) => (
              <div key={v.id} className={`room ${v.status}`}>
                <b>{v.name}</b><small>{v.type}, {v.capacity} seats</small>
                <span>{v.status === 'busy' ? v.detail : 'Free'}</span>
              </div>
            ))}
          </div>
          <div className="card chips"><h3>Teachers free in this slot</h3>
            {data.freeTeachers.length ? data.freeTeachers.map((f) => <span key={f.id}>{f.name}</span>) : 'Everyone is busy.'}
          </div>
        </>
      )}
    </>
  );
}
