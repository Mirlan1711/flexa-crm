import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCurrentUser, getTasksPage, logout } from "./services/api";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import UsersPage from "./pages/UsersPage";
import ActivityLogPage from "./pages/ActivityLogPage";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/ClientsPage";
import DealsPage from "./pages/DealsPage";
import TasksPage from "./pages/TasksPage";
import CustomFieldsPage from "./pages/CustomFieldsPage";
import StatusesPage from "./pages/StatusesPage";

function NotificationsBell({ authenticated }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!authenticated) {
      setNotifications([]);
      return undefined;
    }
    let active = true;
    Promise.all([
      getTasksPage({ due: "overdue", page_size: 50, ordering: "due_date" }),
      getTasksPage({ due: "today", page_size: 50, ordering: "due_date" }),
    ]).then(([overdue, today]) => {
      if (!active) return;
      const overdueItems = overdue.items.map((task) => ({ ...task, kind: "overdue" }));
      const todayItems = today.items.map((task) => ({ ...task, kind: "today" }));
      setNotifications([...overdueItems, ...todayItems]);
    }).catch(() => active && setNotifications([]));
    return () => { active = false; };
  }, [authenticated]);

  if (!authenticated) return null;
  return <div className="notification-box">
    <button className="notification-button" onClick={() => setOpen((value) => !value)} aria-label="Уведомления">
      <span className="notification-icon">🔔</span><span>Уведомления</span>{notifications.length > 0 && <b>{notifications.length}</b>}
    </button>
    {open && <div className="notification-menu"><div className="notification-heading"><strong>Уведомления</strong><span>{notifications.length}</span></div>{notifications.length === 0 ? <p className="muted">Новых уведомлений нет.</p> : notifications.map((task) => <Link key={`${task.kind}-${task.id}`} to="/tasks" onClick={() => setOpen(false)} className={`notification-item ${task.kind === "overdue" ? "is-overdue" : ""}`}><strong>{task.kind === "overdue" ? "Просроченная задача" : "Задача на сегодня"}</strong><span>{task.title}</span><small>{task.due_date || "Без срока"}</small></Link>)}</div>}
  </div>;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(localStorage.getItem("access_token")));
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const updateAuth = () => {
      const hasToken = Boolean(localStorage.getItem("access_token"));
      setAuthenticated(hasToken);
      if (hasToken) getCurrentUser().then(setCurrentUser).catch(() => setCurrentUser(null));
      else setCurrentUser(null);
    };
    updateAuth();
    window.addEventListener("auth-change", updateAuth);
    return () => window.removeEventListener("auth-change", updateAuth);
  }, []);

  function signOut() {
    logout();
    navigate("/");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to={authenticated ? "/dashboard" : "/"}>flexa</Link>
        {authenticated && <nav><Link to="/dashboard">Панель управления</Link><Link to="/clients">Клиенты</Link><Link to="/deals">Сделки</Link><Link to="/tasks">Задачи</Link><Link to="/custom-fields">Настройка полей</Link>{(currentUser?.is_staff || ["admin", "supervisor"].includes(currentUser?.role)) && <><Link to="/statuses">Настройка статусов</Link><Link to="/users">Пользователи</Link><Link to="/activity-log">Журнал</Link></>}<NotificationsBell authenticated={authenticated} /><Link to="/profile">Профиль</Link><button className="topbar-logout" onClick={signOut}>Выйти</button></nav>}
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage user={currentUser} />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/deals" element={<DealsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/custom-fields" element={<CustomFieldsPage />} />
            <Route path="/statuses" element={<StatusesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/users" element={<UsersPage currentUser={currentUser} />} />
            <Route path="/activity-log" element={<ActivityLogPage />} />
          </Route>
          <Route path="*" element={<Navigate to={authenticated ? "/dashboard" : "/"} replace />} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="footer-brand"><strong>flexa CRM</strong><p>Универсальная система управления клиентами, сделками и задачами.</p></div>
        <div className="footer-column"><strong>Разделы</strong><Link to={authenticated ? "/clients" : "/"}>Клиенты</Link><Link to={authenticated ? "/deals" : "/"}>Сделки</Link><Link to={authenticated ? "/tasks" : "/"}>Задачи</Link></div>
        <div className="footer-column"><strong>Возможности</strong><span>Пользовательские поля</span><span>Статистика и отчёты</span><span>Роли и права доступа</span></div>
        <div className="footer-meta"><span>Версия 1.0.0</span><span>© 2026 flexa</span></div>
      </footer>
    </div>
  );
}

