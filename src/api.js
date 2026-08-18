// Same backend as task-dashboard: task-dashboard-backend on Railway,
// new /api/equipment, /api/daily-tasks, /api/assigned-tasks routes.
// Auth follows the existing convention: PIN sent as 'x-pin' header,
// server resolves it to a role (owner | sysadmin) per request —
// nothing about auth lives in the frontend bundle.
const API_BASE =
  import.meta.env.VITE_API_URL || "https://task-dashboard-backend-production.up.railway.app/api";

function pin() {
  return sessionStorage.getItem("ikorka_sysadmin_pin") || "";
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-pin": pin(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `request_failed_${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (candidatePin) =>
    fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: candidatePin }),
    }).then(async (res) => {
      if (!res.ok) throw new Error("invalid_pin");
      return res.json(); // { role }
    }),

  getEquipment: () => request("/equipment"),
  addEquipment: (item) => request("/equipment", { method: "POST", body: JSON.stringify(item) }),
  updateEquipment: (id, patch) =>
    request(`/equipment/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteEquipment: (id) => request(`/equipment/${id}`, { method: "DELETE" }),
  bulkCheckEquipment: (ids) =>
    request("/equipment/bulk-check", { method: "PATCH", body: JSON.stringify({ ids }) }),

  getEquipmentLog: () => request("/equipment-log"),

  getDaily: () => request("/daily-tasks"),
  addDaily: (text) => request("/daily-tasks", { method: "POST", body: JSON.stringify({ text }) }),
  toggleDaily: (id, done) =>
    request(`/daily-tasks/${id}`, { method: "PATCH", body: JSON.stringify({ done }) }),
  editDaily: (id, text) =>
    request(`/daily-tasks/${id}`, { method: "PATCH", body: JSON.stringify({ text }) }),
  deleteDaily: (id) => request(`/daily-tasks/${id}`, { method: "DELETE" }),

  getAssigned: () => request("/assigned-tasks"),
  addAssigned: (title) =>
    request("/assigned-tasks", { method: "POST", body: JSON.stringify({ title }) }),
  setAssignedStatus: (id, status) =>
    request(`/assigned-tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  editAssignedTitle: (id, title) =>
    request(`/assigned-tasks/${id}`, { method: "PATCH", body: JSON.stringify({ title }) }),
  deleteAssigned: (id) => request(`/assigned-tasks/${id}`, { method: "DELETE" }),

  getAssets: () => request("/assets"),
  addAsset: (asset) => request("/assets", { method: "POST", body: JSON.stringify(asset) }),
  updateAsset: (id, patch) =>
    request(`/assets/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteAsset: (id) => request(`/assets/${id}`, { method: "DELETE" }),
};

export function setStoredPin(p) {
  sessionStorage.setItem("ikorka_sysadmin_pin", p);
}
export function clearStoredPin() {
  sessionStorage.removeItem("ikorka_sysadmin_pin");
}
export function getStoredRole() {
  return sessionStorage.getItem("ikorka_sysadmin_role") || null;
}
export function setStoredRole(role) {
  sessionStorage.setItem("ikorka_sysadmin_role", role);
}
export function clearStoredRole() {
  sessionStorage.removeItem("ikorka_sysadmin_role");
}
