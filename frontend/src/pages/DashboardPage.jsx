import { useEffect, useState } from "react";
import { getDashboardStats } from "../services/api";
import BarChart from "../components/BarChart";

export default function DashboardPage({ user }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboardStats().then(setStats).catch((requestError) => setError(requestError.message));
  }, []);

  const cards = stats ? [
    ["Клиенты", stats.clients],
    ["Активные сделки", stats.active_deals],
    ["Задачи на сегодня", stats.tasks_today],
    ["Просроченные задачи", stats.overdue_tasks],
  ] : [];

  return (
    <section>
      <h1>Панель управления</h1>
      <p className="muted">{user ? `Вы вошли как ${user.username}.` : "Здесь будут сводная статистика и быстрый доступ к разделам CRM."}</p>
      {error && <p className="error">{error}</p>}
      <div className="stats-grid">{cards.map(([title, value]) => <div className="card stat-card" key={title}><span>{title}</span><strong>{value}</strong></div>)}</div>
      {stats && <div className="dashboard-summary"><div className="card"><h2>Сумма активных сделок</h2><strong className="summary-value">{Number(stats.deal_amount).toLocaleString("ru-RU")} ₽</strong></div><div className="card"><h2>Конверсия сделок</h2><strong className="summary-value">{stats.conversion.rate}%</strong><p className="muted">Завершено {stats.conversion.completed} из {stats.conversion.total}</p></div><div className="card chart-card"><h2>Сделки по статусам</h2><BarChart items={stats.deals_by_status.map((item) => ({ label: item.status__name, count: item.count }))} labelKey="label" valueKey="count" /></div><div className="card chart-card"><h2>Продажи по месяцам</h2><BarChart items={stats.sales_by_month.map((item) => ({ label: item.month, total: item.total }))} labelKey="label" valueKey="total" formatter={(value) => `${value.toLocaleString("ru-RU")} ₽`} /></div><div className="card chart-card"><h2>Задачи по приоритетам</h2><BarChart items={stats.tasks_by_priority.map((item) => ({ label: item.priority === "high" ? "Высокий" : item.priority === "low" ? "Низкий" : "Средний", count: item.count }))} labelKey="label" valueKey="count" /></div><div className="card chart-card"><h2>Активность менеджеров</h2><BarChart items={stats.manager_activity.map((item) => ({ label: item.username, count: item.count }))} labelKey="label" valueKey="count" /></div></div>}
    </section>
  );
}

