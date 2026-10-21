import { useEffect, useState } from "react";
import { createDeal, deleteDeal, getClients, getCustomFields, getDealStatuses, getDealsPage, updateDeal } from "../services/api";
import CustomFieldInput from "../components/CustomFieldInput";
import Pagination from "../components/Pagination";
import { downloadCsv, parseCsv } from "../utils/csv";

const emptyForm = { name: "", client: "", status: "", amount: "", planned_end_date: "", description: "", custom_data: {} };

function rowValue(row, names) {
  const key = names.find((name) => Object.prototype.hasOwnProperty.call(row, name));
  return key ? row[key] : "";
}

export default function DealsPage() {
  const [deals, setDeals] = useState([]);
  const [kanbanDeals, setKanbanDeals] = useState([]);
  const [clients, setClients] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [view, setView] = useState("list");
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    Promise.all([getDealsPage({ page: 1, ordering }), getClients({ page_size: 50 }), getDealStatuses(), getCustomFields("deal")])
      .then(([loadedDeals, loadedClients, loadedStatuses, loadedCustomFields]) => {
        setDeals(loadedDeals.items);
        setPageCount(loadedDeals.count);
        setClients(loadedClients);
        setStatuses(loadedStatuses);
        setCustomFields(loadedCustomFields);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  async function loadKanban() {
    setKanbanLoading(true);
    try {
      const loaded = await getDealsPage({ ...(search ? { search } : {}), page_size: 50, ordering: "-created_at" });
      setKanbanDeals(loaded.items);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setKanbanLoading(false);
    }
  }

  useEffect(() => {
    if (view === "kanban") loadKanban();
  }, [view]);

  function changeForm(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function searchDeals(targetPage = 1, targetOrdering = ordering) {
    try {
      const loaded = await getDealsPage({ ...(search ? { search } : {}), page: targetPage, ordering: targetOrdering });
      setDeals(loaded.items);
      setPageCount(loaded.count);
      setPage(targetPage);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function startEdit(deal) {
    setEditingId(deal.id);
    setForm({ name: deal.name, client: deal.client, status: deal.status, amount: deal.amount, planned_end_date: deal.planned_end_date || "", description: deal.description, custom_data: deal.custom_data || {} });
  }

  async function submit(event) {
    event.preventDefault();
    setError(""); setNotice("");
    try {
      const payload = { ...form, amount: form.amount || 0, client: Number(form.client), status: form.status || null };
      const saved = editingId ? await updateDeal(editingId, payload) : await createDeal(payload);
      setDeals((items) => editingId ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items]);
      setKanbanDeals((items) => editingId ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items]);
      if (!editingId) setPageCount((count) => count + 1);
      setForm(emptyForm);
      setEditingId(null);
      setNotice(editingId ? "Сделка обновлена." : "Сделка создана.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function remove(id) {
    if (!window.confirm("Удалить сделку?")) return;
    try {
      await deleteDeal(id);
      setDeals((items) => items.filter((deal) => deal.id !== id));
      setKanbanDeals((items) => items.filter((deal) => deal.id !== id));
      setPageCount((count) => Math.max(0, count - 1));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function moveDeal(deal, statusId) {
    if (deal.status === statusId) return;
    const status = statuses.find((item) => item.id === statusId);
    const previous = kanbanDeals;
    setKanbanDeals((items) => items.map((item) => item.id === deal.id ? { ...item, status: statusId, status_name: status?.name || item.status_name } : item));
    try {
      const saved = await updateDeal(deal.id, {
        name: deal.name,
        client: deal.client,
        responsible: deal.responsible || null,
        status: statusId,
        amount: deal.amount || 0,
        planned_end_date: deal.planned_end_date || null,
        description: deal.description || "",
        custom_data: deal.custom_data || {},
      });
      setDeals((items) => items.map((item) => item.id === saved.id ? saved : item));
      setKanbanDeals((items) => items.map((item) => item.id === saved.id ? saved : item));
      setNotice(`Сделка «${deal.name}» переведена в статус «${status?.name || "новый"}».`);
    } catch (requestError) {
      setKanbanDeals(previous);
      setError(requestError.message);
    }
  }

  async function exportDeals() {
    try {
      const loaded = await getDealsPage({ page_size: 50, ordering: "name" });
      downloadCsv("flexa-deals.csv", loaded.items.map((deal) => ({
        name: deal.name,
        client: deal.client_name,
        amount: deal.amount,
        status: deal.status_name || "",
        planned_end_date: deal.planned_end_date || "",
        description: deal.description,
      })));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function importDeals(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true); setError(""); setNotice("");
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) throw new Error("CSV-файл пустой или не содержит строки с заголовками.");
      let imported = 0;
      for (const row of rows) {
        const name = rowValue(row, ["name", "Название"]).trim();
        const clientName = rowValue(row, ["client", "Клиент"]).trim().toLowerCase();
        const client = clients.find((item) => item.name.toLowerCase() === clientName);
        if (!name || !client) continue;
        const statusName = rowValue(row, ["status", "Статус"]).trim().toLowerCase();
        const status = statuses.find((item) => item.name.toLowerCase() === statusName);
        const payload = {
          name,
          client: client.id,
          amount: rowValue(row, ["amount", "Сумма"]) || 0,
          planned_end_date: rowValue(row, ["planned_end_date", "Дата завершения", "Дата"] ) || null,
          description: rowValue(row, ["description", "Описание"]),
        };
        if (status) payload.status = status.id;
        await createDeal(payload);
        imported += 1;
      }
      await searchDeals(1);
      setNotice(imported ? `Импортировано сделок: ${imported}.` : "В файле не найдено корректных сделок.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div><h1>Сделки</h1><p className="muted">Управление продажами и этапами работы с клиентами.</p></div>
        <div className="page-actions"><label className="file-button secondary">{importing ? "Импорт..." : "Импорт CSV"}<input type="file" accept=".csv,text/csv" onChange={importDeals} disabled={importing} /></label><button className="secondary" onClick={exportDeals}>Экспорт CSV</button><div className="view-switch"><button className={view === "list" ? "active" : "secondary"} onClick={() => setView("list")}>Список</button><button className={view === "kanban" ? "active" : "secondary"} onClick={() => setView("kanban")}>Канбан</button></div></div>
      </div>
      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}
      <div className="client-layout">
        <form className="card client-form" onSubmit={submit}>
          <h2>{editingId ? "Редактирование сделки" : "Новая сделка"}</h2>
          <label>Название<input name="name" value={form.name} onChange={changeForm} required /></label>
          <label>Клиент<select name="client" value={form.client} onChange={changeForm} required><option value="">Выберите клиента</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
          <label>Статус<select name="status" value={form.status} onChange={changeForm}><option value="">Новая</option>{statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}</select></label>
          <label>Сумма<input type="number" min="0" step="0.01" name="amount" value={form.amount} onChange={changeForm} /></label>
          <label>Дата завершения<input type="date" name="planned_end_date" value={form.planned_end_date} onChange={changeForm} /></label>
          <label>Описание<textarea name="description" value={form.description} onChange={changeForm} rows="4" /></label>
          {customFields.map((field) => <CustomFieldInput key={field.id} field={field} value={form.custom_data[field.field_key]} onChange={(value) => setForm({ ...form, custom_data: { ...form.custom_data, [field.field_key]: value } })} />)}
          <button type="submit">{editingId ? "Сохранить" : "Добавить сделку"}</button>
          {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Отмена</button>}
        </form>
        {view === "kanban" ? <div className="kanban-wrap">{kanbanLoading ? <p className="muted empty-state">Загрузка сделок...</p> : <div className="kanban-board">{statuses.map((status) => <div className="kanban-column" key={status.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const deal = kanbanDeals.find((item) => item.id === Number(event.dataTransfer.getData("deal-id"))); if (deal) moveDeal(deal, status.id); }}><div className="kanban-column-heading"><div><span className="status-dot" style={{ backgroundColor: status.color }} /><strong>{status.name}</strong></div><span>{kanbanDeals.filter((deal) => deal.status === status.id).length}</span></div><div className="kanban-cards">{kanbanDeals.filter((deal) => deal.status === status.id).map((deal) => <article className="kanban-card" key={deal.id} draggable onDragStart={(event) => event.dataTransfer.setData("deal-id", String(deal.id))}><div className="kanban-card-top"><strong>{deal.name}</strong><button className="icon-button" title="Редактировать" onClick={() => startEdit(deal)}>⋯</button></div><span className="muted">{deal.client_name}</span><strong className="kanban-amount">{Number(deal.amount).toLocaleString("ru-RU")} ₽</strong>{deal.planned_end_date && <span className="date-label">до {deal.planned_end_date}</span>}<div className="kanban-card-actions"><button className="secondary" onClick={() => startEdit(deal)}>Изменить</button><button className="danger" onClick={() => remove(deal.id)}>Удалить</button></div></article>)}</div></div>)}</div>}</div> : <div className="card client-list"><div className="search-row"><input placeholder="Поиск по названию или клиенту" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchDeals(1)} /><button onClick={() => searchDeals(1)}>Найти</button><select value={ordering} onChange={(e) => { setOrdering(e.target.value); searchDeals(1, e.target.value); }}><option value="-created_at">Сначала новые</option><option value="created_at">Сначала старые</option><option value="name">Название А–Я</option><option value="-name">Название Я–А</option><option value="-amount">Сначала дорогие</option><option value="amount">Сначала дешёвые</option></select></div>{deals.length === 0 ? <p className="muted empty-state">Сделки пока не добавлены.</p> : <div className="client-items">{deals.map((deal) => <article className="client-item" key={deal.id}><div><h3>{deal.name}</h3><p>{deal.client_name} · {Number(deal.amount).toLocaleString("ru-RU")} ₽</p><span className="status-badge">{deal.status_name}</span>{deal.planned_end_date && <span className="date-label"> до {deal.planned_end_date}</span>}</div><div className="item-actions"><button className="secondary" onClick={() => startEdit(deal)}>Изменить</button><button className="danger" onClick={() => remove(deal.id)}>Удалить</button></div></article>)}</div>}<Pagination page={page} count={pageCount} pageSize={10} onChange={(nextPage) => searchDeals(nextPage)} /></div>}
      </div>
    </section>
  );
}
