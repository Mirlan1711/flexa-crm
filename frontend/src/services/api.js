const API_URL = "http://127.0.0.1:8000/api";

export class ApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ApiError";
    this.details = details;
  }
}

function errorMessage(data, fallback = "Ошибка запроса") {
  if (typeof data?.detail === "string") return data.detail;
  if (data && typeof data === "object") {
    const first = Object.values(data).flat()[0];
    if (typeof first === "string") return first;
  }
  return fallback;
}

function clearAuth() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.dispatchEvent(new Event("auth-change"));
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return false;

  try {
    const response = await fetch(`${API_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!response.ok) {
      clearAuth();
      return false;
    }
    const data = await response.json();
    localStorage.setItem("access_token", data.access);
    if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
    return true;
  } catch {
    clearAuth();
    return false;
  }
}

async function request(path, options = {}, canRefresh = true) {
  const token = localStorage.getItem("access_token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (response.status === 401 && canRefresh && !path.includes("/auth/token/")) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request(path, options, false);
  }
  if (response.status === 204) return null;
  const data = await response.json();
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const seconds = Number(retryAfter);
    const wait = Number.isFinite(seconds) && seconds > 60
      ? ` Повторите попытку примерно через ${Math.ceil(seconds / 60)} мин.`
      : " Повторите попытку немного позже.";
    throw new ApiError(`Слишком много запросов к серверу.${wait}`, data);
  }
  if (!response.ok) throw new ApiError(errorMessage(data), data);
  return data;
}

function pageData(data) {
  if (Array.isArray(data)) return { items: data, count: data.length, next: null, previous: null };
  return { items: data.results || [], count: data.count || 0, next: data.next, previous: data.previous };
}

function queryPath(path, params = {}) {
  const query = new URLSearchParams(params).toString();
  return `${path}${query ? `?${query}` : ""}`;
}

export async function login(username, password) {
  const response = await fetch(`${API_URL}/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = response.status === 401
      ? "Неверный логин/email или пароль. Проверьте данные и статус аккаунта."
      : errorMessage(data, "Не удалось выполнить вход");
    throw new ApiError(message, data);
  }
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  window.dispatchEvent(new Event("auth-change"));
  return data;
}

export async function register(user) {
  return request("/auth/register/", { method: "POST", body: JSON.stringify(user) });
}

export function logout() {
  clearAuth();
}

export function updateCurrentUser(user) {
  return request("/auth/me/", { method: "PATCH", body: JSON.stringify(user) });
}

export function changePassword(passwords) {
  return request("/auth/me/password/", { method: "POST", body: JSON.stringify(passwords) });
}

export function getUsers() {
  return request("/auth/users/");
}

export function getAssignees() {
  return request("/auth/assignees/");
}

export function updateUser(id, user) {
  return request(`/auth/users/${id}/`, { method: "PATCH", body: JSON.stringify(user) });
}

export function getActivityLogs(params = {}) {
  return getActivityLogPage(params).then((page) => page.items);
}

export function getActivityLogPage(params = {}) {
  return request(queryPath("/activity-log/", params)).then(pageData);
}

export async function getCurrentUser() {
  return request("/auth/me/");
}

export function getClients(params = {}) {
  return getClientsPage(params).then((page) => page.items);
}

export function getClientsPage(params = {}) {
  return request(queryPath("/clients/", params)).then(pageData);
}

export function getClientStatuses() {
  return request("/client-statuses/");
}

export function createClient(client) {
  return request("/clients/", { method: "POST", body: JSON.stringify(client) });
}

export function updateClient(id, client) {
  return request(`/clients/${id}/`, { method: "PUT", body: JSON.stringify(client) });
}

export function deleteClient(id) {
  return request(`/clients/${id}/`, { method: "DELETE" });
}

export function getDeals(params = {}) {
  return getDealsPage(params).then((page) => page.items);
}

export function getDealsPage(params = {}) {
  return request(queryPath("/deals/", params)).then(pageData);
}

export function getDealStatuses() {
  return request("/deal-statuses/");
}

export function createDeal(deal) {
  return request("/deals/", { method: "POST", body: JSON.stringify(deal) });
}

export function updateDeal(id, deal) {
  return request(`/deals/${id}/`, { method: "PUT", body: JSON.stringify(deal) });
}

export function deleteDeal(id) {
  return request(`/deals/${id}/`, { method: "DELETE" });
}

export function getTasks(params = {}) {
  return getTasksPage(params).then((page) => page.items);
}

export function getTasksPage(params = {}) {
  return request(queryPath("/tasks/", params)).then(pageData);
}

export function getTaskStatuses() {
  return request("/task-statuses/");
}

export function getStatuses(params = {}) {
  return request(queryPath("/statuses/", params));
}

export function createStatus(status) {
  return request("/statuses/", { method: "POST", body: JSON.stringify(status) });
}

export function updateStatus(id, status) {
  return request(`/statuses/${id}/`, { method: "PUT", body: JSON.stringify(status) });
}

export function deleteStatus(id) {
  return request(`/statuses/${id}/`, { method: "DELETE" });
}

export function createTask(task) {
  return request("/tasks/", { method: "POST", body: JSON.stringify(task) });
}

export function updateTask(id, task) {
  return request(`/tasks/${id}/`, { method: "PUT", body: JSON.stringify(task) });
}

export function deleteTask(id) {
  return request(`/tasks/${id}/`, { method: "DELETE" });
}

export function getCustomFields(entityType) {
  const query = entityType ? `?entity_type=${encodeURIComponent(entityType)}` : "";
  return request(`/custom-fields/${query}`);
}

export function createCustomField(field) {
  return request("/custom-fields/", { method: "POST", body: JSON.stringify(field) });
}

export function updateCustomField(id, field) {
  return request(`/custom-fields/${id}/`, { method: "PUT", body: JSON.stringify(field) });
}

export function deleteCustomField(id) {
  return request(`/custom-fields/${id}/`, { method: "DELETE" });
}

export function getDashboardStats() {
  return request("/dashboard/stats/");
}

export function fieldError(error, field) {
  const value = error?.details?.[field];
  if (Array.isArray(value)) return value.join(" ");
  return typeof value === "string" ? value : "";
}

