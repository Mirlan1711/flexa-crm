import { useEffect, useState } from "react";
import { changePassword, getCurrentUser, updateCurrentUser } from "../services/api";
import FieldError from "../components/FieldError";

const emptyPassword = { current_password: "", new_password: "", new_password_confirm: "" };
const roleLabels = { admin: "Администратор", manager: "Менеджер", supervisor: "Руководитель", user: "Пользователь" };

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ email: "", first_name: "", last_name: "", phone: "" });
  const [password, setPassword] = useState(emptyPassword);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    getCurrentUser().then((loadedUser) => { setUser(loadedUser); setForm({ email: loadedUser.email || "", first_name: loadedUser.first_name || "", last_name: loadedUser.last_name || "", phone: loadedUser.phone || "" }); }).catch((requestError) => setError(requestError));
  }, []);

  async function saveProfile(event) {
    event.preventDefault(); setError(null); setMessage("");
    try { const saved = await updateCurrentUser(form); setUser(saved); setMessage("Профиль сохранён."); } catch (requestError) { setError(requestError); }
  }

  async function savePassword(event) {
    event.preventDefault(); setError(null); setMessage("");
    try { await changePassword(password); setPassword(emptyPassword); setMessage("Пароль успешно изменён."); } catch (requestError) { setError(requestError); }
  }

  if (!user) return <section className="card"><p className="muted">Загрузка профиля...</p></section>;
  return (
    <section>
      <div className="page-heading"><div><h1>Профиль пользователя</h1><p className="muted">Личные данные и настройки безопасности аккаунта.</p></div></div>
      <div className="profile-layout">
        <div className="card profile-card"><div className="profile-avatar">{(user.first_name || user.username).charAt(0).toUpperCase()}</div><h2>{user.first_name || user.username} {user.last_name}</h2><p className="muted">@{user.username}</p><span className="status-badge">{roleLabels[user.role] || user.role}</span></div>
        <div className="profile-forms">
          <form className="card" onSubmit={saveProfile}><h2>Основные данные</h2><label>Логин<input value={user.username} disabled /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /><FieldError error={error} field="email" /></label><div className="form-grid"><label>Имя<input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /><FieldError error={error} field="first_name" /></label><label>Фамилия<input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /><FieldError error={error} field="last_name" /></label></div><label>Телефон<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><FieldError error={error} field="phone" /></label><button type="submit">Сохранить профиль</button></form>
          <form className="card" onSubmit={savePassword}><h2>Смена пароля</h2><label>Текущий пароль<input type="password" value={password.current_password} onChange={(e) => setPassword({ ...password, current_password: e.target.value })} required /><FieldError error={error} field="current_password" /></label><label>Новый пароль<input type="password" value={password.new_password} onChange={(e) => setPassword({ ...password, new_password: e.target.value })} minLength="8" required /><FieldError error={error} field="new_password" /></label><label>Повторите новый пароль<input type="password" value={password.new_password_confirm} onChange={(e) => setPassword({ ...password, new_password_confirm: e.target.value })} minLength="8" required /><FieldError error={error} field="new_password_confirm" /></label><button type="submit">Изменить пароль</button></form>
          {message && <p className="success">{message}</p>}{error && !Object.keys(error.details || {}).length && <p className="error">{error.message}</p>}
        </div>
      </div>
    </section>
  );
}
