export default function BarChart({ items, labelKey, valueKey, formatter = (value) => value }) {
  if (!items?.length) return <p className="muted">Нет данных</p>;
  const max = Math.max(...items.map((item) => Number(item[valueKey]) || 0), 1);
  return <div className="bar-chart">{items.map((item) => { const value = Number(item[valueKey]) || 0; return <div className="bar-item" key={String(item[labelKey])}><div className="bar-caption"><span>{item[labelKey]}</span><strong>{formatter(value)}</strong></div><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max((value / max) * 100, value ? 4 : 0)}%` }} /></div></div>; })}</div>;
}
