import { useEffect, useState } from "react";
import { createStatus, deleteStatus, getStatuses, updateStatus } from "../services/api";

const emptyForm = {
  name: "", entity_type: "client", color: "#64748b", sort_order: 0,
  is_final: false, is_active: true,
};

const entityLabels = { client: "Клиент", deal: "Сделка", task: "Задача" };

export default function StatusesPage() {
  const [statuses, setStatuses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadStatuses() {
    try {
      setStatuses(await getStatuses());
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => { loadStatuses(); }, []);

  function changeForm(event) {
    const { name, value, type, checked } = event.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({ ...item, sort_order: item.sort_order ?? 0 });
    setError("");
    setMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const payload = { ...form, sort_order: Number(form.sort_order) || 0 };
      const saved = editingId ? await updateStatus(editingId, payload) : await createStatus(payload);
      setStatuses((items) => editingId
        ? items.map((item) => item.id === saved.id ? saved : item)
        : [...items, saved]);
      setMessage(editingId ? "Статус изменён." : "Статус создан.");
      resetForm();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function remove(id) {
    if (!window.confirm("Удалить статус? Если он используется, сначала отключите его.")) return;
    setError("");
    try {
      await deleteStatus(id);
      setStatuses((items) => items.filter((item) => item.id !== id));
      setMessage("Статус удалён.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div><h1>Настройка статусов</h1><p className="muted">Создавайте собственные этапы работы для клиентов, сделок и задач.</p></div>
      </div>
      <div className="client-layout">
        <form className="card client-form" onSubmit={submit}>
          <h2>{editingId ? "Изменение статуса" : "Новый статус"}</h2>
          <label>Название<input name="name" value={form.name} onChange={changeForm} required maxLength="100" /></label>
          <label>Раздел<select name="entity_type" value={form.entity_type} onChange={changeForm} disabled={Boolean(editingId)}>{Object.entries(entityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Цвет<input type="color" name="color" value={form.color} onChange={changeForm} /></label>
          <label>Порядок<input type="number" min="0" name="sort_order" value={form.sort_order} onChange={changeForm} /></label>
          <label className="checkbox-label"><input type="checkbox" name="is_final" checked={form.is_final} onChange={changeForm} /> Финальный статус</label>
          <label className="checkbox-label"><input type="checkbox" name="is_active" checked={form.is_active} onChange={changeForm} /> Статус активен</label>
          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}
          <button type="submit">{editingId ? "Сохранить" : "Добавить статус"}</button>
          {editingId && <button type="button" className="secondary" onClick={resetForm}>Отмена</button>}
        </form>
        <div className="card client-list">
          <h2>Настроенные статусы</h2>
          {statuses.length === 0 ? <p className="muted empty-state">Статусы пока не настроены.</p> : <div className="client-items">{statuses.map((item) => <article className="client-item" key={item.id}><div><h3><span className="status-dot" style={{ backgroundColor: item.color }} /> {item.name}</h3><p>{entityLabels[item.entity_type]} · порядок {item.sort_order}</p><span className="status-badge">{item.is_active ? "Активен" : "Отключён"}</span>{item.is_final && <span className="status-badge">Финальный</span>}</div><div className="item-actions"><button className="secondary" onClick={() => startEdit(item)}>Изменить</button><button className="danger" onClick={() => remove(item.id)}>Удалить</button></div></article>)}</div>}
        </div>
      </div>
    </section>
  );
}
