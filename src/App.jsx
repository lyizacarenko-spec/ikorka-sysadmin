import React, { useState, useEffect, useRef } from "react";
import {
  Laptop, Headphones, Mouse, Package, Plus, Trash2, ClipboardCheck,
  Clock, Play, Check, X, AlertTriangle, CalendarClock, ListChecks,
  MonitorSmartphone, ChevronRight, ChevronLeft, CircleDot, Lock, LogOut,
  TrendingUp, Pencil, Warehouse, Building2, CreditCard, Layers,
} from "lucide-react";
import { api, setStoredPin, clearStoredPin, getStoredRole, setStoredRole, clearStoredRole } from "./api.js";

// ---------- design tokens ----------
const T = {
  bg: "#0d1117",
  panel: "#151b23",
  panelAlt: "#1c2430",
  border: "#2a3441",
  text: "#e6edf3",
  sub: "#8b96a5",
  accent: "#3ddc97",
  accentDim: "#1f6b4f",
  amber: "#f0b429",
  red: "#f0555a",
  blue: "#5aa9f0",
};

const CATS = [
  { id: "laptop", label: "Ноутбуки", icon: Laptop },
  { id: "headset", label: "Наушники", icon: Headphones },
  { id: "mouse", label: "Мышки", icon: Mouse },
  { id: "other", label: "Другое", icon: Package },
];

const STATUS = {
  working: { label: "В работе", color: T.accent },
  storage: { label: "На складе", color: T.blue },
  repair: { label: "В ремонте", color: T.amber },
  decommissioned: { label: "Списано", color: T.red },
};

const ZONES = [
  { id: "warehouse", label: "Склад", icon: Warehouse },
  { id: "office", label: "Офіс", icon: Building2 },
];

// "storage" means two different things depending on where the item
// physically is: on the warehouse it really is "on the shelf"; in the
// office it means "not checked out to anyone right now" — a reserve,
// not a location. Same status value in the DB, different label.
function statusLabel(status, zone) {
  if (status === "storage" && zone === "office") return "В резерві";
  return STATUS[status]?.label || status;
}

// Extensible asset types beyond physical equipment. Each type just
// declares its fields + statuses — the backend stores them in a single
// JSONB column, so adding a new type here needs no migration.
const ASSET_TYPES = {
  sim: {
    label: "Сім-карти",
    icon: CreditCard,
    fields: [
      { key: "number", label: "Номер", placeholder: "+380 XX XXX XX XX" },
      {
        key: "operator", label: "Оператор", type: "select",
        options: ["Київстар", "Vodafone", "lifecell", "Trimob"], allowOther: true,
      },
      { key: "assigned_to", label: "Кому видано", placeholder: "Ім'я або «Склад»" },
    ],
    statuses: {
      active: { label: "Активна", color: T.accent },
      free: { label: "Вільна", color: T.blue },
      blocked: { label: "Заблокована", color: T.amber },
      lost: { label: "Втрачена", color: T.red },
    },
  },
};

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function fmtDuration(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const ms = new Date(endIso) - new Date(startIso);
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} год ${m} хв` : `${m} хв`;
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function getWeekDays(offset) {
  const now = new Date();
  const dow = now.getDay() === 0 ? 7 : now.getDay(); // 1=Mon..7=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow + 1 + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
const DOW_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт"];
function useTicker(active) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}

function Pill({ color, children }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
        color, background: color + "1a", border: `1px solid ${color}40`,
        fontFamily: "ui-monospace, monospace", letterSpacing: 0.2,
      }}
    >
      <CircleDot size={10} />
      {children}
    </span>
  );
}

// ---------------- Login screen ----------------
// PIN check is server-side (POST /api/login) — the client never knows
// the real PINs, it just forwards whatever was typed and trusts the
// role the backend returns.
function LoginScreen({ onLoggedIn }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!value.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const { role } = await api.login(value.trim());
      setStoredPin(value.trim());
      setStoredRole(role);
      onLoggedIn(role);
    } catch {
      setError("Невірний PIN");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, color: T.text,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "ui-sans-serif, system-ui",
    }}>
      <div style={{ ...panelStyle, padding: 28, width: 280, textAlign: "center" }}>
        <Lock size={22} color={T.sub} style={{ marginBottom: 10 }} />
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Панель сисадміна</div>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="PIN"
          style={{ ...inputStyle, width: "100%", textAlign: "center", fontSize: 18, letterSpacing: 4, boxSizing: "border-box" }}
        />
        {error && <div style={{ color: T.red, fontSize: 12, marginTop: 8 }}>{error}</div>}
        <button onClick={submit} disabled={busy} style={{ ...btnStyle(T.accent), width: "100%", justifyContent: "center", marginTop: 14 }}>
          {busy ? "…" : "Увійти"}
        </button>
      </div>
    </div>
  );
}

const ROLE_LABELS = {
  owner: "Власник",
  manager: "Менеджер",
  sysadmin: "Сисадмін",
};

function TopBar({ tab, setTab, onLogout, role }) {
  const tabs = [
    { id: "equipment", label: "Техніка", icon: MonitorSmartphone },
    { id: "assets", label: "Інші активи", icon: Layers },
    { id: "daily", label: "Задачі на день", icon: ListChecks },
    { id: "assigned", label: "Задачі від керівника", icon: CalendarClock },
    { id: "weekly", label: "Тижнева аналітика", icon: TrendingUp },
  ];
  return (
    <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.border}`, padding: "0 20px", justifyContent: "space-between" }}>
      <div style={{ display: "flex" }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "14px 16px", background: "transparent", border: "none",
                cursor: "pointer", fontSize: 14, fontWeight: 600,
                color: active ? T.text : T.sub,
                borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
                fontFamily: "ui-sans-serif, system-ui",
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ color: T.sub, fontSize: 12.5 }}>
          Ви увійшли як: <span style={{ color: T.text, fontWeight: 600 }}>{ROLE_LABELS[role] || role}</span>
        </span>
        <button onClick={onLogout} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
          <LogOut size={14} /> Вийти
        </button>
      </div>
    </div>
  );
}

// ---------------- Equipment tab ----------------
function EquipmentTab({ items, reload }) {
  const [zone, setZone] = useState("warehouse");
  const [catFilter, setCatFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [inventoryMode, setInventoryMode] = useState(false);
  const [checked, setChecked] = useState({});
  const [form, setForm] = useState({ cat: "laptop", name: "", inv: "", owner: "" });
  const [showLogEntry, setShowLogEntry] = useState(false);
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().slice(0, 10), item: "", detail: "", action: "",
  });

  const zoneItems = items.filter((i) => (i.zone || "warehouse") === zone);
  const filtered = zoneItems.filter((i) => catFilter === "all" || i.cat === catFilter);
  const counts = CATS.reduce((acc, c) => {
    acc[c.id] = zoneItems.filter((i) => i.cat === c.id && i.status !== "decommissioned").length;
    return acc;
  }, {});
  const zoneCounts = ZONES.reduce((acc, z) => {
    acc[z.id] = items.filter((i) => (i.zone || "warehouse") === z.id).length;
    return acc;
  }, {});

  async function addItem() {
    if (!form.name.trim()) return;
    await api.addEquipment({ cat: form.cat, name: form.name, inv: form.inv || null, owner: form.owner || null, zone });
    setForm({ cat: "laptop", name: "", inv: "", owner: "" });
    setShowAdd(false);
    reload();
  }
  async function setStatus(id, status) {
    await api.updateEquipment(id, { status });
    reload();
  }
  async function setItemZone(id, newZone) {
    await api.updateEquipment(id, { zone: newZone });
    reload();
  }
  async function finishInventory() {
    const ids = Object.keys(checked).filter((id) => checked[id]).map(Number);
    if (ids.length) await api.bulkCheckEquipment(ids);
    setInventoryMode(false);
    setChecked({});
    reload();
  }
  async function addLogEntry() {
    if (!logForm.item.trim()) return;
    await api.addEquipmentLogEntry({
      item: logForm.item.trim(),
      detail: logForm.detail || null,
      action: logForm.action.trim() || "manual",
      ts: `${logForm.date}T12:00:00`,
    });
    setLogForm({ date: new Date().toISOString().slice(0, 10), item: "", detail: "", action: "" });
    setShowLogEntry(false);
    reload();
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {ZONES.map((z) => {
          const Icon = z.icon;
          const active = zone === z.id;
          return (
            <button
              key={z.id}
              onClick={() => { setZone(z.id); setCatFilter("all"); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "9px 16px", borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                background: active ? T.accent + "1f" : T.panel,
                color: active ? T.accent : T.sub,
                border: `1px solid ${active ? T.accent + "50" : T.border}`,
              }}
            >
              <Icon size={15} />
              {z.label} ({zoneCounts[z.id] || 0})
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setCatFilter("all")} style={chipStyle(catFilter === "all")}>
            Усі ({zoneItems.length})
          </button>
          {CATS.map((c) => {
            const Icon = c.icon;
            return (
              <button key={c.id} onClick={() => setCatFilter(c.id)} style={chipStyle(catFilter === c.id)}>
                <Icon size={13} style={{ marginRight: 5 }} />
                {c.label} ({counts[c.id]})
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!inventoryMode ? (
            <>
              <button onClick={() => setInventoryMode(true)} style={btnStyle(T.blue)}>
                <ClipboardCheck size={14} /> Почати інвентаризацію
              </button>
              <button onClick={() => setShowAdd(true)} style={btnStyle(T.accent)}>
                <Plus size={14} /> Додати
              </button>
              <button onClick={() => setShowLogEntry(true)} style={btnStyle(T.sub, true)}>
                <Clock size={14} /> Запис заднім числом
              </button>
            </>
          ) : (
            <>
              <span style={{ color: T.sub, fontSize: 13, alignSelf: "center" }}>
                Відмічено {Object.values(checked).filter(Boolean).length} з {zoneItems.length}
              </span>
              <button onClick={() => { setInventoryMode(false); setChecked({}); }} style={btnStyle(T.sub, true)}>
                Скасувати
              </button>
              <button onClick={finishInventory} style={btnStyle(T.accent)}>
                <Check size={14} /> Завершити
              </button>
            </>
          )}
        </div>
      </div>

      {showAdd && (
        <div style={{ ...panelStyle, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ fontSize: 12, color: T.sub, width: "100%" }}>
            Додається в зону «{ZONES.find((z) => z.id === zone)?.label}»
          </div>
          <div>
            <label style={labelStyle}>Категорія</label>
            <select value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })} style={inputStyle}>
              {CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Назва</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="напр. Dell Latitude 5420" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Інв. номер</label>
            <input value={form.inv} onChange={(e) => setForm({ ...form, inv: e.target.value })} placeholder="IK-LP-010" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Місце / власник</label>
            <input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="Офіс, стіл 5" style={inputStyle} />
          </div>
          <button onClick={addItem} style={btnStyle(T.accent)}>Зберегти</button>
          <button onClick={() => setShowAdd(false)} style={btnStyle(T.sub, true)}><X size={14} /></button>
        </div>
      )}

      {showLogEntry && (
        <div style={{ ...panelStyle, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ fontSize: 12, color: T.sub, width: "100%" }}>
            Ручний запис у лог дій — для того, що відбулось поза системою (напр. вчора)
          </div>
          <div>
            <label style={labelStyle}>Дата</label>
            <input
              type="date"
              value={logForm.date}
              onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
              style={{ ...inputStyle, colorScheme: "dark" }}
            />
          </div>
          <div>
            <label style={labelStyle}>Дія</label>
            <input value={logForm.action} onChange={(e) => setLogForm({ ...logForm, action: e.target.value })} placeholder="напр. Ремонт" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Обладнання</label>
            <input value={logForm.item} onChange={(e) => setLogForm({ ...logForm, item: e.target.value })} placeholder="напр. Lenovo ThinkPad E14" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Деталі</label>
            <input value={logForm.detail} onChange={(e) => setLogForm({ ...logForm, detail: e.target.value })} placeholder="напр. Замінено клавіатуру" style={inputStyle} />
          </div>
          <button onClick={addLogEntry} style={btnStyle(T.accent)}>Зберегти</button>
          <button onClick={() => setShowLogEntry(false)} style={btnStyle(T.sub, true)}><X size={14} /></button>
        </div>
      )}

      <div style={panelStyle}>
        <div style={{ ...rowStyle, color: T.sub, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>
          {inventoryMode && <div style={{ width: 22 }} />}
          <div style={{ flex: 2 }}>Обладнання</div>
          <div style={{ flex: 1 }}>Інв. №</div>
          <div style={{ flex: 1.4 }}>Місце</div>
          <div style={{ flex: 1 }}>Остання перевірка</div>
          <div style={{ flex: 1.2 }}>Статус</div>
          <div style={{ flex: 1 }}>Зона</div>
        </div>
        {filtered.map((item) => {
          const cat = CATS.find((c) => c.id === item.cat) || CATS[3];
          const Icon = cat.icon;
          const st = STATUS[item.status] || STATUS.storage;
          const stale = item.last_check && new Date() - new Date(item.last_check) > 1000 * 60 * 60 * 24 * 35;
          return (
            <div key={item.id} style={{ ...rowStyle, borderTop: `1px solid ${T.border}` }}>
              {inventoryMode && (
                <div style={{ width: 22 }}>
                  <input type="checkbox" checked={!!checked[item.id]} onChange={(e) => setChecked({ ...checked, [item.id]: e.target.checked })} />
                </div>
              )}
              <div style={{ flex: 2, display: "flex", alignItems: "center", gap: 8 }}>
                <Icon size={15} color={T.sub} />
                {item.name}
              </div>
              <div style={{ flex: 1, color: T.sub, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{item.inv || "—"}</div>
              <div style={{ flex: 1.4, color: T.sub }}>{item.owner || "—"}</div>
              <div style={{ flex: 1, color: stale ? T.amber : T.sub, display: "flex", alignItems: "center", gap: 5 }}>
                {stale && <AlertTriangle size={12} />}
                {item.last_check ? String(item.last_check).slice(0, 10) : "—"}
              </div>
              <div style={{ flex: 1.2 }}>
                <select
                  value={item.status}
                  onChange={(e) => setStatus(item.id, e.target.value)}
                  style={{ background: "transparent", border: "none", color: st.color, fontWeight: 600, fontSize: 12, fontFamily: "ui-monospace, monospace" }}
                >
                  {Object.keys(STATUS).map((k) => (
                    <option key={k} value={k} style={{ background: T.panel, color: T.text }}>
                      {statusLabel(k, item.zone || "warehouse")}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <select
                  value={item.zone || "warehouse"}
                  onChange={(e) => setItemZone(item.id, e.target.value)}
                  style={{ background: "transparent", border: "none", color: T.sub, fontWeight: 600, fontSize: 12, fontFamily: "ui-monospace, monospace" }}
                >
                  {ZONES.map((z) => <option key={z.id} value={z.id} style={{ background: T.panel, color: T.text }}>{z.label}</option>)}
                </select>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 16, color: T.sub, fontSize: 13 }}>
            {zone === "office"
              ? "Офісна техніка ще не заведена — додайте першу позицію."
              : "Немає техніки в цій категорії."}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Daily tasks tab ----------------
function DailyTab({ items, reload }) {
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  async function add() {
    if (!text.trim()) return;
    await api.addDaily(text.trim());
    setText("");
    reload();
  }
  async function toggle(item) {
    await api.toggleDaily(item.id, !item.done);
    reload();
  }
  async function remove(id) {
    await api.deleteDaily(id);
    reload();
  }
  function startEdit(item) {
    setEditingId(item.id);
    setEditValue(item.text);
  }
  async function saveEdit(id) {
    if (!editValue.trim()) return;
    await api.editDaily(id, editValue.trim());
    setEditingId(null);
    reload();
  }
  async function changeCompletedDate(id, dateStr) {
    if (!dateStr) return;
    await api.setDailyCompletedAt(id, `${dateStr}T12:00:00`);
    reload();
  }
  const doneCount = items.filter((i) => i.done).length;
  return (
    <div style={{ padding: 20, maxWidth: 640 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Нова задача на сьогодні..."
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={add} style={btnStyle(T.accent)}><Plus size={14} /> Додати</button>
      </div>
      <div style={{ color: T.sub, fontSize: 12, marginBottom: 10 }}>{doneCount} з {items.length} виконано</div>
      <div style={panelStyle}>
        {items.map((item, idx) => (
          <div key={item.id} style={{ ...rowStyle, borderTop: idx > 0 ? `1px solid ${T.border}` : "none", gap: 10 }}>
            <input type="checkbox" checked={item.done} onChange={() => toggle(item)} />
            {editingId === item.id ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveEdit(item.id)}
                onBlur={() => saveEdit(item.id)}
                style={{ ...inputStyle, flex: 1 }}
              />
            ) : (
              <div
                onDoubleClick={() => startEdit(item)}
                style={{ flex: 1, textDecoration: item.done ? "line-through" : "none", color: item.done ? T.sub : T.text }}
              >
                {item.text}
              </div>
            )}
            {item.done && (
              <input
                type="date"
                title="Дата виконання — можна поставити заднім числом"
                value={item.completed_at ? String(item.completed_at).slice(0, 10) : ""}
                onChange={(e) => changeCompletedDate(item.id, e.target.value)}
                style={{ ...inputStyle, padding: "4px 6px", fontSize: 11.5, colorScheme: "dark" }}
              />
            )}
            <button onClick={() => startEdit(item)} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer" }}>
              <Pencil size={14} />
            </button>
            <button onClick={() => remove(item.id)} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer" }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {items.length === 0 && <div style={{ padding: 16, color: T.sub, fontSize: 13 }}>Задач на сьогодні ще немає.</div>}
      </div>
    </div>
  );
}

// ---------------- Assigned tasks tab (time-tracked) ----------------
function LiveElapsed({ startedAt }) {
  useTicker(true);
  const secs = Math.floor((Date.now() - new Date(startedAt)) / 1000);
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return <span style={{ fontFamily: "ui-monospace, monospace", color: T.amber, fontWeight: 700 }}>{h}:{m}:{s}</span>;
}

function AssignedTab({ items, reload, role }) {
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  async function addTask() {
    if (!title.trim()) return;
    await api.addAssigned(title.trim());
    setTitle("");
    reload();
  }
  async function start(id) {
    await api.setAssignedStatus(id, "active");
    reload();
  }
  async function finish(id) {
    await api.setAssignedStatus(id, "done");
    reload();
  }
  function startEdit(task) {
    setEditingId(task.id);
    setEditValue(task.title);
  }
  async function saveEdit(id) {
    if (!editValue.trim()) return;
    await api.editAssignedTitle(id, editValue.trim());
    setEditingId(null);
    reload();
  }
  async function remove(id) {
    await api.deleteAssigned(id);
    reload();
  }

  const statusMeta = {
    queued: { label: "Не почато", color: T.sub },
    active: { label: "В роботі", color: T.amber },
    done: { label: "Завершено", color: T.accent },
  };

  return (
    <div style={{ padding: 20, maxWidth: 760 }}>
      {role === "owner" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Постав нову задачу, напр. «Аналітика Бінотел за серпень»"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={addTask} style={btnStyle(T.accent)}><Plus size={14} /> Поставити задачу</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((task) => {
          const meta = statusMeta[task.status];
          const dur = fmtDuration(task.started_at, task.finished_at);
          return (
            <div key={task.id} style={{ ...panelStyle, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  {editingId === task.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(task.id)}
                      onBlur={() => saveEdit(task.id)}
                      style={{ ...inputStyle, width: "100%", marginBottom: 6, boxSizing: "border-box" }}
                    />
                  ) : (
                    <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                      {task.title}
                      {role === "owner" && (
                        <button onClick={() => startEdit(task)} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", display: "inline-flex" }}>
                          <Pencil size={12} />
                        </button>
                      )}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 14, fontSize: 12, color: T.sub, flexWrap: "wrap" }}>
                    {task.from_user && <span>Від: {task.from_user}</span>}
                    {task.started_at && <span>Взято: {fmtTime(task.started_at)}</span>}
                    {task.finished_at && <span>Завершено: {fmtTime(task.finished_at)}</span>}
                    {dur && <span style={{ color: T.text, fontWeight: 600 }}><Clock size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{dur}</span>}
                    {task.status === "active" && <LiveElapsed startedAt={task.started_at} />}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Pill color={meta.color}>{meta.label}</Pill>
                  {task.status === "queued" && (
                    <button onClick={() => start(task.id)} style={btnStyle(T.blue)}><Play size={13} /> Взяти в роботу</button>
                  )}
                  {task.status === "active" && (
                    <button onClick={() => finish(task.id)} style={btnStyle(T.accent)}><Check size={13} /> Завершити</button>
                  )}
                  {role === "owner" && (
                    <button onClick={() => remove(task.id)} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer" }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <div style={{ ...panelStyle, padding: 16, color: T.sub, fontSize: 13 }}>Задач від керівника ще немає.</div>}
      </div>
    </div>
  );
}

// ---------------- Weekly analytics tab ----------------
function WeeklyTab({ daily, assigned, equipmentLog }) {
  const [offset, setOffset] = useState(0);
  const days = getWeekDays(offset);
  const monday = days[0], friday = days[4];
  const rangeLabel = `${monday.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" })} – ${friday.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" })}`;

  const dayData = days.map((d) => ({
    date: d,
    dailyDone: daily.filter((t) => t.completed_at && isSameDay(new Date(t.completed_at), d)),
    assignedDone: assigned.filter((t) => t.finished_at && isSameDay(new Date(t.finished_at), d)),
    equip: equipmentLog.filter((e) => isSameDay(new Date(e.ts), d)),
  }));

  const totals = {
    daily: dayData.reduce((s, d) => s + d.dailyDone.length, 0),
    assigned: dayData.reduce((s, d) => s + d.assignedDone.length, 0),
    equip: dayData.reduce((s, d) => s + d.equip.length, 0),
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setOffset(offset - 1)} style={btnStyle(T.sub, true)}><ChevronLeft size={14} /></button>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            Тиждень {rangeLabel} {offset === 0 && <span style={{ color: T.accent, fontWeight: 600, fontSize: 12 }}> · поточний</span>}
          </div>
          <button onClick={() => setOffset(offset + 1)} disabled={offset === 0} style={{ ...btnStyle(T.sub, true), opacity: offset === 0 ? 0.35 : 1, cursor: offset === 0 ? "default" : "pointer" }}>
            <ChevronRight size={14} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: T.sub }}>
          <span><b style={{ color: T.text }}>{totals.daily}</b> задач на день</span>
          <span><b style={{ color: T.text }}>{totals.assigned}</b> задач від керівника</span>
          <span><b style={{ color: T.text }}>{totals.equip}</b> дій з технікою</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {dayData.map((d, i) => {
          const total = d.dailyDone.length + d.assignedDone.length + d.equip.length;
          const isToday = isSameDay(d.date, new Date());
          return (
            <div key={i} style={{ ...panelStyle, padding: 12, border: isToday ? `1px solid ${T.accent}60` : panelStyle.border, minHeight: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{DOW_LABELS[i]} <span style={{ color: T.sub, fontWeight: 400 }}>{d.date.getDate()}.{String(d.date.getMonth() + 1).padStart(2, "0")}</span></div>
                {total > 0 && <span style={{ fontSize: 11, color: T.accent, fontWeight: 700 }}>{total}</span>}
              </div>
              {total === 0 && <div style={{ fontSize: 12, color: T.sub, fontStyle: "italic" }}>Нічого не зафіксовано</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {d.assignedDone.map((t) => (
                  <div key={"a" + t.id} style={{ fontSize: 11.5, display: "flex", gap: 5, alignItems: "flex-start" }}>
                    <Check size={11} color={T.accent} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{t.title} <span style={{ color: T.sub }}>({fmtDuration(t.started_at, t.finished_at)})</span></span>
                  </div>
                ))}
                {d.dailyDone.map((t) => (
                  <div key={"d" + t.id} style={{ fontSize: 11.5, display: "flex", gap: 5, alignItems: "flex-start" }}>
                    <Check size={11} color={T.blue} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{t.text}</span>
                  </div>
                ))}
                {d.equip.map((e) => (
                  <div key={"e" + e.id} style={{ fontSize: 11.5, display: "flex", gap: 5, alignItems: "flex-start" }}>
                    <MonitorSmartphone size={11} color={T.sub} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{e.action}: {e.item}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Assets tab (SIM cards, extensible) ----------------
function AssetsTab({ items, reload }) {
  const typeKeys = Object.keys(ASSET_TYPES);
  const [type, setType] = useState(typeKeys[0]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({});
  const [otherMode, setOtherMode] = useState({});

  const config = ASSET_TYPES[type];
  const typeItems = items.filter((a) => a.type === type);

  function selectField(key, value) {
    if (value === "__other__") {
      setOtherMode({ ...otherMode, [key]: true });
      setForm({ ...form, [key]: "" });
    } else {
      setForm({ ...form, [key]: value });
    }
  }

  async function addAsset() {
    const first = config.fields[0];
    if (first && !String(form[first.key] || "").trim()) return;
    await api.addAsset({ type, fields: form, status: Object.keys(config.statuses)[0] });
    setForm({});
    setOtherMode({});
    setShowAdd(false);
    reload();
  }
  async function setStatus(id, status) {
    await api.updateAsset(id, { status });
    reload();
  }
  async function remove(id) {
    await api.deleteAsset(id);
    reload();
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {typeKeys.map((k) => {
            const Icon = ASSET_TYPES[k].icon;
            return (
              <button key={k} onClick={() => { setType(k); setShowAdd(false); }} style={chipStyle(type === k)}>
                <Icon size={13} style={{ marginRight: 5 }} />
                {ASSET_TYPES[k].label} ({items.filter((a) => a.type === k).length})
              </button>
            );
          })}
        </div>
        <button onClick={() => setShowAdd(true)} style={btnStyle(T.accent)}>
          <Plus size={14} /> Додати
        </button>
      </div>

      {showAdd && (
        <div style={{ ...panelStyle, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          {config.fields.map((f) => (
            <div key={f.key}>
              <label style={labelStyle}>{f.label}</label>
              {f.type === "select" && !otherMode[f.key] ? (
                <select
                  value={form[f.key] || ""}
                  onChange={(e) => selectField(f.key, e.target.value)}
                  style={inputStyle}
                >
                  <option value="" disabled>Оберіть...</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  {f.allowOther && <option value="__other__">Інше…</option>}
                </select>
              ) : f.type === "select" ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    autoFocus
                    value={form[f.key] || ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder="Свій варіант"
                    style={inputStyle}
                  />
                  <button
                    onClick={() => { setOtherMode({ ...otherMode, [f.key]: false }); setForm({ ...form, [f.key]: "" }); }}
                    style={btnStyle(T.sub, true)}
                    title="Повернутись до списку"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <input
                  value={form[f.key] || ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
          <button onClick={addAsset} style={btnStyle(T.accent)}>Зберегти</button>
          <button onClick={() => setShowAdd(false)} style={btnStyle(T.sub, true)}><X size={14} /></button>
        </div>
      )}

      <div style={panelStyle}>
        <div style={{ ...rowStyle, color: T.sub, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>
          {config.fields.map((f) => <div key={f.key} style={{ flex: 1 }}>{f.label}</div>)}
          <div style={{ flex: 1 }}>Статус</div>
          <div style={{ width: 24 }} />
        </div>
        {typeItems.map((item) => (
          <div key={item.id} style={{ ...rowStyle, borderTop: `1px solid ${T.border}` }}>
            {config.fields.map((f) => (
              <div key={f.key} style={{ flex: 1, color: f.key === config.fields[0].key ? T.text : T.sub }}>
                {item.fields?.[f.key] || "—"}
              </div>
            ))}
            <div style={{ flex: 1 }}>
              <select
                value={item.status}
                onChange={(e) => setStatus(item.id, e.target.value)}
                style={{
                  background: "transparent", border: "none", fontWeight: 600, fontSize: 12,
                  fontFamily: "ui-monospace, monospace",
                  color: config.statuses[item.status]?.color || T.sub,
                }}
              >
                {Object.entries(config.statuses).map(([k, v]) => (
                  <option key={k} value={k} style={{ background: T.panel, color: T.text }}>{v.label}</option>
                ))}
              </select>
            </div>
            <div style={{ width: 24 }}>
              <button onClick={() => remove(item.id)} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer" }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {typeItems.length === 0 && (
          <div style={{ padding: 16, color: T.sub, fontSize: 13 }}>Ще немає жодного запису — додайте перший.</div>
        )}
      </div>
    </div>
  );
}

// ---------------- shared styles ----------------
const panelStyle = { background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 };
const rowStyle = { display: "flex", alignItems: "center", padding: "10px 14px", fontSize: 13.5 };
const labelStyle = { display: "block", fontSize: 11, color: T.sub, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 };
const inputStyle = { background: T.panelAlt, border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 10px", color: T.text, fontSize: 13, outline: "none" };
function chipStyle(active) {
  return {
    padding: "6px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
    background: active ? T.accent + "1f" : "transparent",
    color: active ? T.accent : T.sub,
    border: `1px solid ${active ? T.accent + "50" : T.border}`,
    display: "inline-flex", alignItems: "center",
  };
}
function btnStyle(color, ghost) {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 13px", borderRadius: 7, fontSize: 12.5, fontWeight: 700,
    cursor: "pointer", border: `1px solid ${ghost ? T.border : color + "60"}`,
    background: ghost ? "transparent" : color + "1a", color: ghost ? T.sub : color,
  };
}

function Dashboard({ role, onLogout }) {
  const [tab, setTab] = useState("equipment");
  const [equipment, setEquipment] = useState([]);
  const [equipmentLog, setEquipmentLog] = useState([]);
  const [assets, setAssets] = useState([]);
  const [daily, setDaily] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // A single failed request here used to leave the whole Promise.all
  // rejected with nothing to catch it — loading stayed true forever,
  // no matter what actually caused the failure. Always resolve out of
  // "loading" now, and show a retry instead of hanging silently.
  async function reloadAll() {
    setLoadError(null);
    try {
      const [eq, log, as, dl, asg] = await Promise.all([
        api.getEquipment(), api.getEquipmentLog(), api.getAssets(), api.getDaily(), api.getAssigned(),
      ]);
      setEquipment(eq);
      setEquipmentLog(log);
      setAssets(as);
      setDaily(dl);
      setAssigned(asg);
    } catch (e) {
      setLoadError(e.message || "load_failed");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reloadAll(); }, []);

  const activeCount = assigned.filter((a) => a.status === "active").length;
  const workingEquip = equipment.filter((e) => e.status !== "decommissioned").length;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "ui-sans-serif, system-ui" }}>
      <div style={{ padding: "18px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Панель сисадміна</div>
          <div style={{ fontSize: 12.5, color: T.sub, marginTop: 2 }}>
            {workingEquip} одиниць техніки на обліку · {activeCount > 0 ? `${activeCount} задача в роботі` : "немає активних задач"}
          </div>
        </div>
        {activeCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.amber, fontWeight: 700 }}>
            <ChevronRight size={14} />
            зараз в роботі
          </div>
        )}
      </div>
      <TopBar tab={tab} setTab={setTab} onLogout={onLogout} role={role} />
      {loading ? (
        <div style={{ padding: 40, color: T.sub, textAlign: "center" }}>Завантаження…</div>
      ) : loadError ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: T.red, fontSize: 13, marginBottom: 12 }}>
            Не вдалося завантажити дані: {loadError}
          </div>
          <button onClick={() => { setLoading(true); reloadAll(); }} style={btnStyle(T.accent)}>
            Повторити
          </button>
        </div>
      ) : (
        <>
          {tab === "equipment" && <EquipmentTab items={equipment} reload={reloadAll} />}
          {tab === "assets" && <AssetsTab items={assets} reload={reloadAll} />}
          {tab === "daily" && <DailyTab items={daily} reload={reloadAll} />}
          {tab === "assigned" && <AssignedTab items={assigned} reload={reloadAll} role={role} />}
          {tab === "weekly" && <WeeklyTab daily={daily} assigned={assigned} equipmentLog={equipmentLog} />}
        </>
      )}
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(getStoredRole());

  function handleLogout() {
    clearStoredPin();
    clearStoredRole();
    setRole(null);
  }

  if (!role) return <LoginScreen onLoggedIn={setRole} />;
  return <Dashboard role={role} onLogout={handleLogout} />;
}
