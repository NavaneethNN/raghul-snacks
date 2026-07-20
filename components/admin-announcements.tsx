"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin-table.module.css";

type Announcement = {
  id: number;
  text: string;
  icon: string | null;
  active: boolean;
  order: number;
  createdAt: Date;
};

export function AdminAnnouncements({ announcements }: { announcements: Announcement[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    text: "",
    icon: "",
    active: true,
    order: 0,
  });

  function handleEdit(announcement: Announcement) {
    setEditingAnnouncement(announcement);
    setFormData({
      text: announcement.text,
      icon: announcement.icon || "",
      active: announcement.active,
      order: announcement.order,
    });
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingAnnouncement(null);
    setFormData({ text: "", icon: "", active: true, order: 0 });
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = editingAnnouncement
        ? `/api/admin/announcements/${editingAnnouncement.id}`
        : "/api/admin/announcements";
      const method = editingAnnouncement ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: formData.text,
          icon: formData.icon || null,
          active: formData.active,
          order: formData.order,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `Failed to ${editingAnnouncement ? 'update' : 'create'} announcement`);
      }

      handleCloseForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingAnnouncement ? 'update' : 'create'} announcement`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    try {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete announcement");

      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete announcement");
    }
  }


  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Announcement Management</p>
          <h1>Top Bar Announcements</h1>
          <p>Manage scrolling announcements shown above the site header.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Announcement
          </button>
        </div>
      </header>

      <section className={styles.workspace}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Icon</th>
                <th>Announcement Text</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcements.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    <div>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      <h3>No announcements yet</h3>
                      <p>Create announcements to display in the top bar.</p>
                      <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
                        Add Announcement
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                announcements.map((announcement) => (
                  <tr key={announcement.id}>
                    <td>
                      <strong style={{ fontSize: '14px' }}>#{announcement.order}</strong>
                    </td>
                    <td>
                      {announcement.icon ? (
                        <span style={{ fontSize: '20px' }}>{announcement.icon}</span>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>—</span>
                      )}
                    </td>
                    <td>
                      <strong>{announcement.text}</strong>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${announcement.active ? styles.success : ""}`} style={{ background: announcement.active ? "#d1fae5" : "#fee2e2", color: announcement.active ? "#065f46" : "#991b1b" }}>
                        {announcement.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{new Date(announcement.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleEdit(announcement)}
                          title="Edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleDelete(announcement.id)}
                          title="Delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingAnnouncement ? 'Edit Announcement' : 'Add Announcement'}</h2>
              <button className={styles.closeButton} onClick={handleCloseForm}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form className={styles.form} onSubmit={handleSubmit}>
              {error && (
                <div style={{ padding: "12px", background: "#fee2e2", border: "1px solid #dc2626", borderRadius: "8px", color: "#991b1b", marginBottom: "20px" }}>
                  {error}
                </div>
              )}
              <div className={styles.field}>
                <label>Announcement Text</label>
                <input
                  type="text"
                  placeholder="e.g., Free shipping on orders above ₹499"
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Icon (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., 📦"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    maxLength={2}
                  />
                  <small style={{ color: '#6b7280', fontSize: '12px' }}>
                    Add an emoji or leave empty
                  </small>
                </div>
                <div className={styles.field}>
                  <label>Display Order</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  />
                  <small style={{ color: '#6b7280', fontSize: '12px' }}>
                    Lower numbers appear first
                  </small>
                </div>
              </div>
              <div className={styles.field}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  Active (Show on site)
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={handleCloseForm}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton} disabled={loading}>
                  {loading ? (editingAnnouncement ? "Updating..." : "Adding...") : (editingAnnouncement ? "Update Announcement" : "Add Announcement")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
