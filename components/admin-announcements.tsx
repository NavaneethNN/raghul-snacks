"use client";

import { useEffect, useState } from "react";
import { AdminHeaderActions } from "./admin-header-actions";
import { ConfirmDialog } from "./admin-confirm-dialog";
import styles from "./admin-table.module.css";

type Announcement = {
  id: number;
  text: string;
  icon: string | null;
  active: boolean;
  order: number;
  createdAt: string;
};

const BLANK = { text: "", icon: "", active: true };

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/immutability

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
    setForm({ ...BLANK });    setFormError("");
    setShowForm(true);
  }

  function openEdit(item: Announcement) {
    setEditing(item);
    setForm({ text: item.text, icon: item.icon ?? "", active: item.active });
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
        body: JSON.stringify({ text: form.text.trim(), icon: form.icon.trim() || null, active: form.active }),
      });
      const data = await res.json() as Announcement & { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      if (editing) {
        setItems((prev) => prev.map((i) => i.id === editing.id ? data : i));
        flash("Announcement updated.");
      } else {
        setItems((prev) => [...prev, data]);
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
    setBusyId(id);
    try {
      await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      flash("Announcement deleted.");
    } catch { flash("Failed to delete."); }
    finally { setBusyId(null); }
  }

  
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Announcement Management</p>
          <h1>Announcements</h1>
          <p>These rotate in the announcement bar above the site header.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className={styles.primaryButton} onClick={openCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Announcement
          </button>
        </div>
        <div className={styles.headerBell}><AdminHeaderActions /></div>
      </header>

      {message && <p className={styles.message}>{message}</p>}


      <section className={styles.workspace}>
        {loading ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}><tbody><tr><td colSpan={5} className={styles.emptyState}><div><p>Loading…</p></div></td></tr></tbody></table>
          </div>
        ) : items.length === 0 ? (
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
                  <th className={styles.colHide} style={{ width: 48 }}>Icon</th>
                  <th>Text</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className={styles.colHide} style={{ fontSize: 20, textAlign: "center" }}>
                      {item.icon || "—"}
                    </td>
                    <td style={{ maxWidth: 340, wordBreak: "break-word" }}>
                      <span style={{ fontWeight: 500 }}>{item.text}</span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${item.active ? styles.success : ""}`}>
                        {item.active ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.iconButton}
                          onClick={() => toggleActive(item)}
                          disabled={busyId === item.id}
                          title={item.active ? "Hide" : "Activate"}
                        >
                          {item.active ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          )}
                        </button>
                        <button
                          className={styles.iconButton}
                          onClick={() => openEdit(item)}
                          title="Edit"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button
                          className={styles.iconButton}
                          onClick={() => setConfirmDeleteId(item.id)}
                          title="Delete"
                          style={{ color: "#dc2626" }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
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

      {confirmDeleteId !== null && (
        <ConfirmDialog
          message="Delete this announcement? This cannot be undone."
          onConfirm={() => { const id = confirmDeleteId; setConfirmDeleteId(null); handleDelete(id); }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
