import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, register } from "../services/api";
import FieldError from "../components/FieldError";

const emptyForm = { username: "", email: "", first_name: "", last_name: "", password: "", password_confirm: "" };

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function changeForm(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(form);
      await login(form.username, form.password);
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card auth-card">
      <h1>Регистрация</h1>
      <p className="muted">Создайте рабочий аккаунт CRM. Роль пользователя назначается системой.</p>
      <form onSubmit={submit}>
        <label>Логин<input name="username" value={form.username} onChange={changeForm} minLength="3" required /><FieldError error={error} field="username" /></label>
        <label>Email<input type="email" name="email" value={form.email} onChange={changeForm} required /><FieldError error={error} field="email" /></label>
        <div className="form-grid"><label>Имя<input name="first_name" value={form.first_name} onChange={changeForm} /><FieldError error={error} field="first_name" /></label><label>Фамилия<input name="last_name" value={form.last_name} onChange={changeForm} /><FieldError error={error} field="last_name" /></label></div>
        <label>Пароль<input type="password" name="password" value={form.password} onChange={changeForm} minLength="8" required /><FieldError error={error} field="password" /></label>
        <label>Повторите пароль<input type="password" name="password_confirm" value={form.password_confirm} onChange={changeForm} minLength="8" required /><FieldError error={error} field="password_confirm" /></label>
        {error && !Object.keys(error.details || {}).length && <p className="error">{error.message}</p>}
        <button type="submit" disabled={loading}>{loading ? "Создание аккаунта..." : "Зарегистрироваться"}</button>
      </form>
      <p className="auth-link">Уже есть аккаунт? <Link to="/">Войти</Link></p>
    </section>
  );
}
