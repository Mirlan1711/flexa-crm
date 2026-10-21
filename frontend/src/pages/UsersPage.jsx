import { useEffect, useState } from "react";
import { getUsers, updateUser } from "../services/api";

const roles = {
  admin: "Администратор",
  supervisor: "Руководитель",
  manager: "Менеджер",
  user: "Пользователь",
};

export default function UsersPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canChangeRoles = currentUser?.is_staff || currentUser?.role === "admin";

  async function loadUsers() {
    try { setUsers(await getUsers()); } catch (requestError) { setError(requestError.message); }
  }

  useEffect(() => { loadUsers(); }, []);

  async function changeRole(user, role) {
    setError(""); setMessage("");
    try {
      const saved = await updateUser(user.id, { role });
      setUsers((items) => items.map((item) => item.id === saved.id ? saved : item));
      setMessage(`Роль пользователя ${user.username} изменена.`);
    } catch (requestError) { setError(requestError.message); }
  }

  async function changeActive(user) {
    if (user.id === currentUser.id) return;
    setError(""); setMessage("");
    try {
      const saved = await updateUser(user.id, { is_active: !user.is_active });
      setUsers((items) => items.map((item) => item.id === saved.id ? saved : item));
      setMessage(`Пользователь ${user.username} ${saved.is_active ? "активирован" : "заблокирован"}.`);
    } catch (requestError) { setError(requestError.message); }
  }

  return (
    <section>
      <div className="page-heading"><div><h1>Пользователи и роли</h1><p className="muted">Распределение прав доступа в CRM.</p></div></div>
      <div className="card user-list">
        {message && <p className="success">{message}</p>}{error && <p className="error">{error}</p>}
        {users.length === 0 ? <p className="muted empty-state">Пользователи не найдены.</p> : <div className="client-items">{users.map((user) => <article className="client-item" key={user.id}><div><h3>{user.first_name || user.username} {user.last_name}</h3><p>@{user.username} · {user.email || "Email не указан"}</p><span className={`status-badge ${user.is_active ? "" : "priority-high"}`}>{user.is_active ? "Активен" : "Заблокирован"}</span></div><div className="user-controls"><label>Роль<select value={user.role} disabled={!canChangeRoles} onChange={(event) => changeRole(user, event.target.value)}>{Object.entries(roles).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><button className="secondary" disabled={!canChangeRoles || user.id === currentUser.id} onClick={() => changeActive(user)}>{user.is_active ? "Заблокировать" : "Активировать"}</button></div></article>)}</div>}
      </div>
    </section>
  );
}
