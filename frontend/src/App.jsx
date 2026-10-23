import { Link, NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
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

const navItems = [
  ["/dashboard", "Главная", "grid"],
  ["/clients", "Клиенты", "users"],
  ["/deals", "Сделки", "briefcase"],
  ["/tasks", "Задачи", "check"],
];

function AppIcon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    check: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18M8 15l2 2 4-4" /></>,
    settings: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.57v.09h-2.4v-.09a1.7 1.7 0 0 0-1.03-1.57 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.5 15a1.7 1.7 0 0 0-1.57-1.03h-.09v-2.4h.09A1.7 1.7 0 0 0 8.5 10a1.7 1.7 0 0 0-.34-1.88L8.1 8.06l1.7-1.7.06.06A1.7 1.7 0 0 0 11.74 6.1 1.7 1.7 0 0 0 12.77 4.5v-.09h2.4v.09A1.7 1.7 0 0 0 16.2 6.1a1.7 1.7 0 0 0 1.88.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.44 10a1.7 1.7 0 0 0 1.57 1.03h.09v2.4h-.09A1.7 1.7 0 0 0 19.4 15Z" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9a2.5 2.5 0 1 1 4.2 1.8c-1 .9-1.8 1.3-1.8 2.7M12 17h.01" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

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
    <button className="notification-button" onClick={() => setOpen((value) => !value)} aria-label="Уведомления" aria-expanded={open}>
      <span className="notification-icon"><AppIcon name="bell" size={18} /></span><span className="notification-label">Уведомления</span>{notifications.length > 0 && <b>{notifications.length}</b>}
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
      {authenticated && <aside className="sidebar">
        <Link className="brand" to="/dashboard"><span className="brand-mark">f</span><span>flexa</span></Link>
        <div className="workspace-switcher"><span className="workspace-dot" /> <span><small>Рабочее пространство</small><strong>flexa CRM</strong></span><span className="workspace-chevron">⌄</span></div>
        <nav className="sidebar-nav" aria-label="Основная навигация">
          <span className="nav-label">Обзор</span>
          {navItems.map(([to, label, icon]) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? "is-active" : ""}><AppIcon name={icon} /><span>{label}</span></NavLink>)}
          <span className="nav-label nav-label-spaced">Управление</span>
          <NavLink to="/custom-fields" className={({ isActive }) => isActive ? "is-active" : ""}><AppIcon name="settings" /><span>Настройка полей</span></NavLink>
          {(currentUser?.is_staff || ["admin", "supervisor"].includes(currentUser?.role)) && <>
            <NavLink to="/statuses" className={({ isActive }) => isActive ? "is-active" : ""}><AppIcon name="settings" /><span>Статусы</span></NavLink>
            <NavLink to="/users" className={({ isActive }) => isActive ? "is-active" : ""}><AppIcon name="users" /><span>Пользователи</span></NavLink>
            <NavLink to="/activity-log" className={({ isActive }) => isActive ? "is-active" : ""}><AppIcon name="check" /><span>Журнал действий</span></NavLink>
          </>}
        </nav>
        <div className="sidebar-bottom"><Link to="/profile"><AppIcon name="users" /><span>Профиль</span></Link><button className="sidebar-logout" onClick={signOut}><AppIcon name="logout" /><span>Выйти</span></button></div>
      </aside>}
      <div className={authenticated ? "app-main" : "app-main app-main-public"}>
        {authenticated && <header className="topbar"><div className="topbar-title"><span className="mobile-brand">flexa</span><span className="topbar-kicker">Рабочая область</span><strong>{currentUser ? `Добро пожаловать, ${currentUser.first_name || currentUser.username}` : "Добро пожаловать"}</strong></div><div className="topbar-actions"><NotificationsBell authenticated={authenticated} /><Link className="topbar-help" to="/profile" aria-label="Справка"><AppIcon name="help" size={19} /></Link><Link className="topbar-avatar" to="/profile" aria-label="Открыть профиль">{(currentUser?.first_name || currentUser?.username || "U").charAt(0).toUpperCase()}</Link></div></header>}
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
    </div>
  );
}

