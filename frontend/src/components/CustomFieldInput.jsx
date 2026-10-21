export default function CustomFieldInput({ field, value, onChange }) {
  const label = `${field.name}${field.is_required ? " *" : ""}`;
  if (field.data_type === "textarea") {
    return <label>{label}<textarea rows="3" value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></label>;
  }
  if (field.data_type === "select") {
    return <label>{label}<select value={value ?? ""} onChange={(event) => onChange(event.target.value)}><option value="">Выберите значение</option>{(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
  }
  if (field.data_type === "boolean") {
    return <label className="checkbox-label"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /> {label}</label>;
  }
  return <label>{label}<input type={field.data_type === "number" ? "number" : field.data_type === "date" ? "date" : "text"} value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></label>;
}
