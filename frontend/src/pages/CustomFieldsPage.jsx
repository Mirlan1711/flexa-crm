import { useEffect, useState } from "react";
import { createCustomField, deleteCustomField, getCustomFields, updateCustomField } from "../services/api";

const emptyForm = { name: "", field_key: "", entity_type: "client", data_type: "text", options: [], is_required: false, is_active: true, sort_order: 0 };
const entityLabels = { client: "Клиент", deal: "Сделка", task: "Задача" };

export default function CustomFieldsPage() {
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [optionsText, setOptionsText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  async function loadFields() {
    try { setFields(await getCustomFields()); } catch (requestError) { setError(requestError.message); }
  }

  useEffect(() => { loadFields(); }, []);

  function changeForm(event) {
    const { name, value, type, checked } = event.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  }

  function startEdit(field) {
    setEditingId(field.id);
    setForm({ ...field });
    setOptionsText((field.options || []).join(", "));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const payload = { ...form, sort_order: Number(form.sort_order) || 0, options: form.data_type === "select" ? optionsText.split(",").map((item) => item.trim()).filter(Boolean) : [] };
      const saved = editingId ? await updateCustomField(editingId, payload) : await createCustomField(payload);
      setFields((items) => editingId ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved]);
      setForm(emptyForm); setOptionsText(""); setEditingId(null);
    } catch (requestError) { setError(requestError.message); }
  }

  async function remove(id) {
    if (!window.confirm("Удалить пользовательское поле?")) return;
    try { await deleteCustomField(id); setFields((items) => items.filter((field) => field.id !== id)); } catch (requestError) { setError(requestError.message); }
  }

  return (
    <section>
      <div className="page-heading"><div><h1>Пользовательские поля</h1><p className="muted">Настройка полей без изменения исходного кода.</p></div></div>
      <div className="client-layout">
        <form className="card client-form" onSubmit={submit}>
          <h2>{editingId ? "Изменение поля" : "Новое поле"}</h2>
          <label>Название<input name="name" value={form.name} onChange={changeForm} required /></label>
          <label>Ключ поля<input name="field_key" value={form.field_key} onChange={changeForm} pattern="[a-z0-9_-]+" required /></label>
          <label>Раздел<select name="entity_type" value={form.entity_type} onChange={changeForm}>{Object.entries(entityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Тип данных<select name="data_type" value={form.data_type} onChange={changeForm}><option value="text">Строка</option><option value="textarea">Многострочный текст</option><option value="number">Число</option><option value="date">Дата</option><option value="boolean">Да/Нет</option><option value="select">Список</option></select></label>
          {form.data_type === "select" && <label>Варианты через запятую<input value={optionsText} onChange={(e) => setOptionsText(e.target.value)} required /></label>}
          <label className="checkbox-label"><input type="checkbox" name="is_required" checked={form.is_required} onChange={changeForm} /> Обязательное поле</label>
          <label className="checkbox-label"><input type="checkbox" name="is_active" checked={form.is_active} onChange={changeForm} /> Поле активно</label>
          {error && <p className="error">{error}</p>}
          <button type="submit">{editingId ? "Сохранить" : "Добавить поле"}</button>
          {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); setOptionsText(""); }}>Отмена</button>}
        </form>
        <div className="card client-list"><h2>Настроенные поля</h2>{fields.length === 0 ? <p className="muted empty-state">Поля пока не настроены.</p> : <div className="client-items">{fields.map((field) => <article className="client-item" key={field.id}><div><h3>{field.name}</h3><p>{entityLabels[field.entity_type]} · {field.field_key} · {field.data_type}</p><span className="status-badge">{field.is_active ? "Активно" : "Отключено"}</span>{field.is_required && <span className="status-badge">Обязательное</span>}</div><div className="item-actions"><button className="secondary" onClick={() => startEdit(field)}>Изменить</button><button className="danger" onClick={() => remove(field.id)}>Удалить</button></div></article>)}</div>}</div>
      </div>
    </section>
  );
}
