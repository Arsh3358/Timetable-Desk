import { useEffect, useState } from 'react';
import { animate, motion } from 'framer-motion';

export const Empty = ({ children }) => <div className="empty">{children}</div>;

export function Table({ heads, rows }) {
  return (
    <div className="sc">
      <table className="t">
        <thead><tr>{heads.map((h) => <th key={h}>{h}</th>)}<th /></tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

export function CountUp({ to }) {
  const [n, setN] = useState(0);
  useEffect(() => { const c = animate(0, to, { duration: 0.8, onUpdate: (v) => setN(Math.round(v)) }); return () => c.stop(); }, [to]);
  return <>{n}</>;
}

export function Bar({ label, percent, text }) {
  return (
    <div className="bar">
      <div className="bl"><span>{label}</span><em>{text}</em></div>
      <div className="tr"><motion.i className={percent > 90 ? 'hi' : ''} initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }} /></div>
    </div>
  );
}

export const Remove = ({ onClick, children = 'Remove' }) => <td><button className="x" onClick={onClick}>{children}</button></td>;
