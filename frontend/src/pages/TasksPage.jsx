import { useEffect, useState } from "react";
import {
  createTask, deleteTask, getAssignees, getClients, getDeals, getCustomFields, getTaskStatuses, getTasksPage, updateTask,
} from "../services/api";
import CustomFieldInput from "../components/CustomFieldInput";
import Pagination from "../components/Pagination";

const emptyForm = {
  title: "", description: "", client: "", deal: "", assignee: "", status: "", priority: "medium", due_date: "", custom_data: {},
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ status: "", priority: "", due: "" });
  const [ordering, setOrdering] = useState("due_date");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  async function loadTasks(targetPage = 1, targetOrdering = ordering) {
    try {
      const loaded = await getTasksPage({ ...(search ? { search } : {}), ...Object.fromEntries(Object.entries(filter).filter(([, value]) => value)), page: targetPage, ordering: targetOrdering });
      setTasks(loaded.items); setPageCount(loaded.count); setPage(targetPage);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    Promise.all([getTasksPage({ page: 1, ordering }), getClients(), getDeals(), getAssignees(), getTaskStatuses(), getCustomFields("task")])
      .then(([loadedTasks, loadedClients, loadedDeals, loadedUsers, loadedStatuses, loadedCustomFields]) => {
        setTasks(loadedTasks.items); setPageCount(loadedTasks.count);
        setClients(loadedClients);
        setDeals(loadedDeals);
        setUsers(loadedUsers.filter((user) => user.is_active));
        setStatuses(loadedStatuses);
        const defaultStatus = loadedStatuses.find((status) => status.name.trim().toLowerCase() === "новая");
        if (defaultStatus) setForm((current) => current.status ? current : { ...current, status: String(defaultStatus.id) });
        setCustomFields(loadedCustomFields);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  function changeForm(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function startEdit(task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      client: task.client || "",
      deal: task.deal || "",
      assignee: task.assignee || "",
      status: task.status || "",
      priority: task.priority,
      due_date: task.due_date || "",
      custom_data: task.custom_data || {},
    });
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const payload = {
        ...form,
        client: form.client ? Number(form.client) : null,
        deal: form.deal ? Number(form.deal) : null,
        assignee: form.assignee ? Number(form.assignee) : null,
        status: form.status ? Number(form.status) : null,
      };
      const saved = editingId ? await updateTask(editingId, payload) : await createTask(payload);
      setTasks((items) => editingId ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items]);
      if (!editingId) setPageCount((count) => count + 1);
      setForm(emptyForm);
      setEditingId(null);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function remove(id) {
    if (!window.confirm("Удалить задачу?")) return;
    try {
      await deleteTask(id);
      setTasks((items) => items.filter((task) => task.id !== id));
      setPageCount((count) => Math.max(0, count - 1));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section>
      <div className="page-heading"><div><h1>Задачи</h1><p className="muted">Планирование работы сотрудников и контроль сроков.</p></div></div>
      <div className="client-layout">
        <form className="card client-form" onSubmit={submit}>
          <h2>{editingId ? "Редактирование задачи" : "Новая задача"}</h2>
          <label>Название<input name="title" value={form.title} onChange={changeForm} required /></label>
          <label>Клиент<select name="client" value={form.client} onChange={changeForm}><option value="">Не выбран</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
          <label>Сделка<select name="deal" value={form.deal} onChange={changeForm}><option value="">Не выбрана</option>{deals.map((deal) => <option key={deal.id} value={deal.id}>{deal.name}</option>)}</select></label>
          <label>Ответственный<select name="assignee" value={form.assignee} onChange={changeForm}><option value="">Автоматически назначить мне</option>{users.map((user) => <option key={user.id} value={user.id}>{user.first_name || user.username}{user.last_name ? ` ${user.last_name}` : ""}</option>)}</select></label>
          <label>Статус<select name="status" value={form.status} onChange={changeForm}>{statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}</select></label>
          <label>Приоритет<select name="priority" value={form.priority} onChange={changeForm}><option value="low">Низкий</option><option value="medium">Средний</option><option value="high">Высокий</option></select></label>
          <label>Срок<input type="date" name="due_date" value={form.due_date} onChange={changeForm} /></label>
          <label>Описание<textarea name="description" value={form.description} onChange={changeForm} rows="4" /></label>
          {customFields.map((field) => <CustomFieldInput key={field.id} field={field} value={form.custom_data[field.field_key]} onChange={(value) => setForm({ ...form, custom_data: { ...form.custom_data, [field.field_key]: value } })} />)}
          {error && <p className="error">{error}</p>}
          <button type="submit">{editingId ? "Сохранить" : "Добавить задачу"}</button>
          {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Отмена</button>}
        </form>
        <div className="card client-list">
          <div className="search-row"><input placeholder="Поиск по задаче, клиенту или сделке" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadTasks(1)} /><button onClick={() => loadTasks(1)}>Найти</button><select value={ordering} onChange={(e) => { setOrdering(e.target.value); loadTasks(1, e.target.value); }}><option value="due_date">Ближайший срок</option><option value="-due_date">Дальний срок</option><option value="priority">Приоритет</option><option value="title">Название А–Я</option><option value="-title">Название Я–А</option></select></div>
          <div className="filter-row"><select value={filter.priority} onChange={(e) => setFilter({ ...filter, priority: e.target.value })}><option value="">Все приоритеты</option><option value="high">Высокий</option><option value="medium">Средний</option><option value="low">Низкий</option></select><select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}><option value="">Все статусы</option>{statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}</select><select value={filter.due} onChange={(e) => setFilter({ ...filter, due: e.target.value })}><option value="">Все сроки</option><option value="today">На сегодня</option><option value="overdue">Просроченные</option></select><button className="secondary" onClick={() => loadTasks(1)}>Применить</button></div>
          {tasks.length === 0 ? <p className="muted empty-state">Задачи пока не добавлены.</p> : <div className="client-items">{tasks.map((task) => <article className="client-item" key={task.id}><div><h3>{task.title}</h3><p>{task.client_name || "Без клиента"}{task.deal_name ? ` · ${task.deal_name}` : ""}{task.due_date ? ` · срок ${task.due_date}` : ""}{task.assignee_name ? ` · ответственный: ${task.assignee_name}` : ""}</p><span className={`status-badge priority-${task.priority}`}>{task.priority === "high" ? "Высокий" : task.priority === "low" ? "Низкий" : "Средний"}</span> <span className="status-badge">{task.status_name}</span></div><div className="item-actions"><button className="secondary" onClick={() => startEdit(task)}>Изменить</button><button className="danger" onClick={() => remove(task.id)}>Удалить</button></div></article>)}</div>}
          <Pagination page={page} count={pageCount} pageSize={10} onChange={(nextPage) => loadTasks(nextPage)} />
        </div>
      </div>
    </section>
  );
}
