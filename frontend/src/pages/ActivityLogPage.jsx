import { useEffect, useState } from "react";
import { getActivityLogPage } from "../services/api";
import Pagination from "../components/Pagination";

const actionLabels = { create: "Создание", update: "Изменение", delete: "Удаление" };

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ entity_type: "", action: "", search: "" });
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");

  async function loadLogs(targetPage = 1) {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const loaded = await getActivityLogPage({ ...params, page: targetPage });
      setLogs(loaded.items); setCount(loaded.count); setPage(targetPage);
    } catch (requestError) { setError(requestError.message); }
  }

  useEffect(() => { loadLogs(); }, []);

  return (
    <section>
      <div className="page-heading"><div><h1>Журнал действий</h1><p className="muted">История изменений объектов CRM с пользователем, датой и IP-адресом.</p></div></div>
      <div className="card activity-card">
        <div className="filter-row"><input placeholder="Поиск по описанию" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /><select value={filters.entity_type} onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}><option value="">Все объекты</option><option value="client">Клиенты</option><option value="deal">Сделки</option><option value="task">Задачи</option></select><select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}><option value="">Все действия</option><option value="create">Создание</option><option value="update">Изменение</option><option value="delete">Удаление</option></select><button onClick={() => loadLogs(1)}>Фильтровать</button></div>
        {error && <p className="error">{error}</p>}
        {logs.length === 0 ? <p className="muted empty-state">Записей пока нет.</p> : <div className="activity-table"><div className="activity-row activity-header"><span>Дата</span><span>Пользователь</span><span>Действие</span><span>Описание</span><span>IP</span></div>{logs.map((log) => <div className="activity-row" key={log.id}><span>{new Date(log.created_at).toLocaleString("ru-RU")}</span><span>{log.username || "Удалённый пользователь"}</span><span className={`activity-action action-${log.action}`}>{actionLabels[log.action] || log.action}</span><span>{log.description}</span><span>{log.ip_address || "—"}</span></div>)}</div>}
        <Pagination page={page} count={count} pageSize={10} onChange={(nextPage) => loadLogs(nextPage)} />
      </div>
    </section>
  );
}
