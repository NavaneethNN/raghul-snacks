"use client";

import { useEffect, useState } from "react";
import styles from "./admin-table.module.css";

type Announcement = {
  id: number;
  text: string;
  icon: string | null;
  active: boolean;
  order: number;
  createdAt: string;
};

const BLANK = { text: "", icon: "", active: true, order: 0 };

export function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements");
      if (res.ok) setItems(await res.json());
    } finally { setLoading(false); }
  }

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2500);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...BLANK, order: items.length });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(item: Announcement) {
    setEditing(item);
    setForm({ text: item.text, icon: item.icon ?? "", active: item.active, order: item.order });
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setFormError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.text.trim()) { setFormError("Announcement text is required."); return; }
    setSaving(true); setFormError("");
    try {
      const url = editing ? `/api/admin/announcements/${editing.id}` : "/api/admin/announcements";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: form.text.trim(), icon: form.icon.trim() || null, active: form.active, order: form.order }),
      });
      const data = await res.json() as Announcement & { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      if (editing) {
        setItems((prev) => prev.map((i) => i.id === editing.id ? data : i).sort((a, b) => a.order - b.order));
        flash("Announcement updated.");
      } else {
        setItems((prev) => [...prev, data].sort((a, b) => a.order - b.order));
        flash("Announcement added.");
      }
      closeForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save.");
    } finally { setSaving(false); }
  }

  async function toggleActive(item: Announcement) {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/announcements/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, active: !item.active } : i));
      flash(item.active ? "Announcement hidden." : "Announcement activated.");
    } catch { flash("Failed to update."); }
    finally { setBusyId(null); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this announcement?")) return;
    setBusyId(id);
    try {
      await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      flash("Announcement deleted.");
    } catch { flash("Failed to delete."); }
    finally { setBusyId(null); }
  }

  async function moveOrder(item: Announcement, dir: -1 | 1) {
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((i) => i.id === item.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];
    // Swap order values
    const newOrder = swap.order;
    const swapOrder = item.order;
    setBusyId(item.id);
    try {
      await Promise.all([
        fetch(`/api/admin/announcements/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: newOrder }) }),
        fetch(`/api/admin/announcements/${swap.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: swapOrder }) }),
      ]);
      setItems((prev) =>
        prev.map((i) => {
          if (i.id === item.id) return { ...i, order: newOrder };
          if (i.id === swap.id) return { ...i, order: swapOrder };
          return i;
        }).sort((a, b) => a.order - b.order)
      );
    } catch { flash("Failed to reorder."); }
    finally { setBusyId(null); }
  }

  const sorted = [...items].sort((a, b) => a.order - b.order);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Announcement Management</p>
          <h1>Announcements</h1>
          <p>These rotate in the announcement bar above the site header.</p>
        </div>
        <button className={styles.primaryButton} onClick={openCreate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Announcement
        </button>
      </header>

      {message && <p className={styles.message}>{message}</p>}

      {/* Live preview strip */}
      {sorted.filter((i) => i.active).length > 0 && (
        <div style={{ background: "#243127", color: "#e5a52f", padding: "10px 16px", borderRadius: 8, marginBottom: 24, fontSize: 12, fontFamily: "'DM Mono',monospace", textAlign: "center", letterSpacing: "0.04em" }}>
          {sorted.filter((i) => i.active).map((i, idx) => (
            <span key={i.id} style={{ marginRight: idx < sorted.filter((x) => x.active).length - 1 ? "0" : "0" }}>
              {idx > 0 && <span style={{ opacity: 0.4, margin: "0 16px" }}>·</span>}
              {i.icon && <span style={{ marginRight: 6 }}>{i.icon}</span>}
              {i.text}
            </span>
          ))}
        </div>
      )}

      <section className={styles.workspace}>
        {loading ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}><tbody><tr><td colSpan={5} className={styles.emptyState}><div><p>Loading…</p></div></td></tr></tbody></table>
          </div>
        ) : sorted.length === 0 ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}><tbody>
              <tr><td colSpan={5} className={styles.emptyState}>
                <div>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <h3>No announcements yet</h3>
                  <p>Add messages to rotate in the top bar.</p>
                  <button className={styles.primaryButton} onClick={openCreate}>Add Announcement</button>
                </div>
              </td></tr>
            </tbody></table>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 72 }}>Order</th>
                  <th style={{ width: 48 }}>Icon</th>
                  <th>Text</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item, idx) => (
                  <tr key={item.id} style={{ opacity: busyId === item.id ? 0.5 : 1, transition: "opacity 0.2s" }}>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                        <button
                          className={styles.iconButton}
                          onClick={() => moveOrder(item, -1)}
                          disabled={idx === 0 || busyId === item.id}
                          title="Move up"
                          style={{ padding: "2px 6px" }}
                        >▲</button>
                        <span style={{ fontSize: 12, color: "#9ca3af", fontFamily: "'DM Mono',monospace" }}>{idx + 1}</span>
                        <button
                          className={styles.iconButton}
                          onClick={() => moveOrder(item, 1)}
                          disabled={idx === sorted.length - 1 || busyId === item.id}
                          title="Move down"
                          style={{ padding: "2px 6px" }}
                        >▼</button>
                      </div>
                    </td>
                    <td>
                      {item.icon
                        ? <span style={{ fontSize: 20 }}>{item.icon}</span>
                        : <span style={{ color: "#9ca3af" }}>—</span>}
                    </td>
                    <td>
                      <strong style={{ fontSize: 14 }}>{item.text}</strong>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleActive(item)}
                        disabled={busyId === item.id}
                        title={item.active ? "Click to hide" : "Click to show"}
                        style={{
                          background: item.active ? "#d1fae5" : "#fee2e2",
                          color: item.active ? "#065f46" : "#991b1b",
                          border: "none",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "'DM Mono',monospace",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {item.active ? "Active" : "Hidden"}
                      </button>
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button className={styles.iconButton} onClick={() => openEdit(item)} title="Edit">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className={styles.iconButton} onClick={() => handleDelete(item.id)} title="Delete">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Form modal */}
      {showForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editing ? "Edit Announcement" : "Add Announcement"}</h2>
              <button className={styles.closeButton} onClick={closeForm}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form className={styles.form} onSubmit={handleSubmit}>
              {formError && (
                <div style={{ padding: "12px", background: "#fee2e2", border: "1px solid #dc2626", borderRadius: 8, color: "#991b1b", marginBottom: 20 }}>
                  {formError}
                </div>
              )}

              <div className={styles.field}>
                <label>Announcement Text *</label>
                <input
                  type="text"
                  placeholder="e.g., Free delivery on orders above ₹499 🚚"
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  autoFocus
                  required
                />
              </div>

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Icon / Emoji</label>
                  <input
                    type="text"
                    placeholder="e.g., 🎉"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    maxLength={4}
                  />
                  <small style={{ color: "#6b7280", fontSize: 12 }}>Optional emoji shown before the text</small>
                </div>
                <div className={styles.field}>
                  <label>Status</label>
                  <select
                    value={form.active ? "active" : "hidden"}
                    onChange={(e) => setForm({ ...form, active: e.target.value === "active" })}
                  >
                    <option value="active">Active — visible on site</option>
                    <option value="hidden">Hidden — saved but not shown</option>
                  </select>
                </div>
              </div>

              {/* Live preview */}
              {form.text && (
                <div style={{ background: "#243127", color: "#e5a52f", padding: "10px 16px", borderRadius: 8, fontSize: 12, fontFamily: "'DM Mono',monospace", textAlign: "center", letterSpacing: "0.04em" }}>
                  {form.icon && <span style={{ marginRight: 8 }}>{form.icon}</span>}
                  {form.text}
                </div>
              )}

              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={closeForm}>Cancel</button>
                <button type="submit" className={styles.primaryButton} disabled={saving}>
                  {saving ? "Saving…" : editing ? "Update" : "Add Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
