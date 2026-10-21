export default function FieldError({ error, field }) {
  const value = error?.details?.[field];
  if (!value) return null;
  return <span className="field-error">{Array.isArray(value) ? value.join(" ") : value}</span>;
}
