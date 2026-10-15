import { useState } from 'react';

/**
 * Small config-driven form.
 * fields: [{ name, label, type?, options?, default?, min?, max?, placeholder?, required? }]
 * `options` is a list of {value,label}, or a function (valuesSoFar) => list, so a later
 * field can depend on an earlier one (e.g. subjects that match the chosen class).
 * Number inputs and numeric select values are sent as numbers.
 */
export default function Form({ title, fields, submit, onSubmit }) {
  const [v, setV] = useState({});

  // Resolve each field in order: current value if still valid, otherwise the default or first option
  const cur = {}, opts = {};
  fields.forEach((f) => {
    const list = typeof f.options === 'function' ? f.options(cur) : f.options;
    opts[f.name] = list;
    let x = v[f.name] ?? f.default;
    if (list && (x === undefined || !list.some((o) => String(o.value) === String(x)))) x = list[0]?.value ?? '';
    cur[f.name] = x ?? '';
  });

  async function handle(e) {
    e.preventDefault();
    const out = {};
    fields.forEach((f) => {
      const x = cur[f.name];
      const numeric = f.type === 'number' || opts[f.name]?.some((o) => typeof o.value === 'number');
      out[f.name] = numeric && x !== '' ? Number(x) : x;
    });
    if (await onSubmit(out)) setV({});
  }

  return (
    <form className="card" onSubmit={handle}>
      <h3>{title}</h3>
      {fields.map((f) => (
        <label key={f.name}>{f.label}
          {opts[f.name] ? (
            <select value={cur[f.name]} onChange={(e) => setV({ ...v, [f.name]: e.target.value })}>
              {opts[f.name].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input type={f.type || 'text'} value={cur[f.name]} min={f.min} max={f.max} placeholder={f.placeholder}
              required={f.required !== false} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} />
          )}
        </label>
      ))}
      <button className="btn w">{submit}</button>
    </form>
  );
}
