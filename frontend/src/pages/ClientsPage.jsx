import { useEffect, useState } from "react";
import {
  createClient, deleteClient, getClientStatuses, getClientsPage, getCustomFields,
  getDealsPage, getTasksPage, updateClient,
} from "../services/api";
import CustomFieldInput from "../components/CustomFieldInput";
import Pagination from "../components/Pagination";
import { downloadCsv, parseCsv } from "../utils/csv";

const emptyForm = { name: "", phone: "", email: "", description: "", status: "", custom_data: {} };

function rowValue(row, names) {
  const key = names.find((name) => Object.prototype.hasOwnProperty.call(row, name));
  return key ? row[key] : "";
}

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [related, setRelated] = useState({ deals: [], tasks: [] });
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importing, setImporting] = useState(false);

  async function loadClients(value = search, targetPage = page, targetOrdering = ordering) {
    try {
      const loaded = await getClientsPage({ ...(value ? { search: value } : {}), page: targetPage, ordering: targetOrdering });
      setClients(loaded.items); setPageCount(loaded.count); setPage(targetPage);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    Promise.all([getClientStatuses(), getClientsPage({ page: 1, ordering }), getCustomFields("client")])
      .then(([loadedStatuses, loadedClients, loadedCustomFields]) => {
        setStatuses(loadedStatuses);
        const defaultStatus = loadedStatuses.find((status) => status.name.trim().toLowerCase() === "новый");
        if (defaultStatus) setForm((current) => current.status ? current : { ...current, status: String(defaultStatus.id) });
        setClients(loadedClients.items); setPageCount(loadedClients.count);
        setCustomFields(loadedCustomFields);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    if (!selectedClient) return undefined;
    let active = true;
    setDetailLoading(true);
    Promise.all([
      getDealsPage({ client: selectedClient.id, page_size: 50, ordering: "-created_at" }),
      getTasksPage({ client: selectedClient.id, page_size: 50, ordering: "due_date" }),
    ])
      .then(([deals, tasks]) => active && setRelated({ deals: deals.items, tasks: tasks.items }))
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setDetailLoading(false));
    return () => { active = false; };
  }, [selectedClient?.id]);

  function changeForm(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function startEdit(client) {
    setEditingId(client.id);
    setForm({ name: client.name, phone: client.phone, email: client.email, description: client.description, status: client.status, custom_data: client.custom_data || {} });
  }

  async function submit(event) {
    event.preventDefault();
    setError(""); setNotice("");
    try {
      const payload = { ...form };
      if (!payload.status) delete payload.status;
      const saved = editingId ? await updateClient(editingId, payload) : await createClient(payload);
      setClients((items) => editingId ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items]);
      if (!editingId) setPageCount((count) => count + 1);
      if (selectedClient?.id === saved.id) setSelectedClient(saved);
      setForm(emptyForm);
      setEditingId(null);
      setNotice(editingId ? "Клиент обновлён." : "Клиент создан.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function remove(id) {
    if (!window.confirm("Удалить клиента?")) return;
    try {
      await deleteClient(id);
      setClients((items) => items.filter((client) => client.id !== id));
      setPageCount((count) => Math.max(0, count - 1));
      if (selectedClient?.id === id) setSelectedClient(null);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function exportClients() {
    try {
      const loaded = await getClientsPage({ page_size: 50, ordering: "name" });
      downloadCsv("flexa-clients.csv", loaded.items.map((client) => ({
        name: client.name,
        phone: client.phone,
        email: client.email,
        status: client.status_name || "",
        description: client.description,
      })));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function importClients(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true); setError(""); setNotice("");
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) throw new Error("CSV-файл пустой или не содержит строки с заголовками.");
      let imported = 0;
      for (const row of rows) {
        const name = rowValue(row, ["name", "Название", "Имя"]).trim();
        if (!name) continue;
        const statusName = rowValue(row, ["status", "Статус"]).trim().toLowerCase();
        const status = statuses.find((item) => item.name.toLowerCase() === statusName);
        const payload = {
          name,
          phone: rowValue(row, ["phone", "Телефон"]),
          email: rowValue(row, ["email", "Email", "Почта"]),
          description: rowValue(row, ["description", "Описание"]),
        };
        if (status) payload.status = status.id;
        await createClient(payload);
        imported += 1;
      }
      await loadClients(search, 1);
      if (imported) setNotice(`Импортировано клиентов: ${imported}.`);
      else setError("В файле не найдено корректных клиентов.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div><h1>Клиенты</h1><p className="muted">Управление клиентской базой CRM.</p></div>
        <div className="page-actions">
          <label className="file-button secondary">{importing ? "Импорт..." : "Импорт CSV"}<input type="file" accept=".csv,text/csv" onChange={importClients} disabled={importing} /></label>
          <button className="secondary" onClick={exportClients}>Экспорт CSV</button>
        </div>
      </div>
      <div className="client-layout">
        <form className="card client-form" onSubmit={submit}>
          <h2>{editingId ? "Редактирование клиента" : "Новый клиент"}</h2>
          <label>Название<input name="name" value={form.name} onChange={changeForm} required /></label>
          <label>Телефон<input name="phone" value={form.phone} onChange={changeForm} /></label>
          <label>Email<input type="email" name="email" value={form.email} onChange={changeForm} /></label>
          <label>Статус<select name="status" value={form.status} onChange={changeForm}>{statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}</select></label>
          {customFields.map((field) => <CustomFieldInput key={field.id} field={field} value={form.custom_data[field.field_key]} onChange={(value) => setForm({ ...form, custom_data: { ...form.custom_data, [field.field_key]: value } })} />)}
          <label>Описание<textarea name="description" value={form.description} onChange={changeForm} rows="4" /></label>
          {error && <p className="error">{error}</p>}{notice && <p className="success">{notice}</p>}
          <button type="submit">{editingId ? "Сохранить" : "Добавить клиента"}</button>
          {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Отмена</button>}
        </form>
        <div className="card client-list">
          <div className="search-row"><input placeholder="Поиск по имени, телефону или email" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadClients(search, 1)} /><button onClick={() => loadClients(search, 1)}>Найти</button><select value={ordering} onChange={(e) => { setOrdering(e.target.value); loadClients(search, 1, e.target.value); }}><option value="-created_at">Сначала новые</option><option value="created_at">Сначала старые</option><option value="name">Имя А–Я</option><option value="-name">Имя Я–А</option></select></div>
          {clients.length === 0 ? <p className="muted empty-state">Клиенты пока не добавлены.</p> : <div className="client-items">{clients.map((client) => <article className="client-item" key={client.id}><div><h3>{client.name}</h3><p>{client.email || "Email не указан"} · {client.phone || "Телефон не указан"}</p><span className="status-badge">{client.status_name || "Новый"}</span></div><div className="item-actions"><button className="secondary" onClick={() => setSelectedClient(client)}>Карточка</button><button className="secondary" onClick={() => startEdit(client)}>Изменить</button><button className="danger" onClick={() => remove(client.id)}>Удалить</button></div></article>)}</div>}
          <Pagination page={page} count={pageCount} pageSize={10} onChange={(nextPage) => loadClients(search, nextPage)} />
        </div>
      </div>
      {selectedClient && <div className="modal-backdrop" onClick={() => setSelectedClient(null)}><article className="modal-card client-detail-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading"><div><span className="eyebrow">Карточка клиента</span><h2>{selectedClient.name}</h2></div><button className="secondary close-button" onClick={() => setSelectedClient(null)}>Закрыть</button></div>
        <div className="detail-grid"><div><span className="detail-label">Email</span><strong>{selectedClient.email || "Не указан"}</strong></div><div><span className="detail-label">Телефон</span><strong>{selectedClient.phone || "Не указан"}</strong></div><div><span className="detail-label">Статус</span><strong>{selectedClient.status_name || "Новый"}</strong></div><div><span className="detail-label">Ответственный</span><strong>{selectedClient.responsible_name || "Не назначен"}</strong></div></div>
        {selectedClient.description && <div className="detail-section"><h3>Описание</h3><p>{selectedClient.description}</p></div>}
        {Object.keys(selectedClient.custom_data || {}).length > 0 && <div className="detail-section"><h3>Пользовательские поля</h3><div className="custom-data-list">{Object.entries(selectedClient.custom_data).map(([key, value]) => <div key={key}><span>{key}</span><strong>{String(value)}</strong></div>)}</div></div>}
        <div className="detail-columns"><div className="detail-section"><h3>Сделки <span>{related.deals.length}</span></h3>{detailLoading ? <p className="muted">Загрузка...</p> : related.deals.length ? related.deals.map((deal) => <div className="related-item" key={deal.id}><strong>{deal.name}</strong><span>{Number(deal.amount).toLocaleString("ru-RU")} ₽ · {deal.status_name}</span></div>) : <p className="muted">Сделок нет.</p>}</div><div className="detail-section"><h3>Задачи <span>{related.tasks.length}</span></h3>{detailLoading ? <p className="muted">Загрузка...</p> : related.tasks.length ? related.tasks.map((task) => <div className="related-item" key={task.id}><strong>{task.title}</strong><span>{task.due_date || "Без срока"} · {task.status_name}</span></div>) : <p className="muted">Задач нет.</p>}</div></div>
      </article></div>}
    </section>
  );
}
