"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeaderActions } from "./admin-header-actions";
import styles from "./admin-table.module.css";

type Message = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const subjectLabel: Record<string, string> = {
  order: "Order Inquiry",
  product: "Product Question",
  bulk: "Bulk Orders",
  feedback: "Feedback",
  other: "Other",
};

export function AdminMessages({ messages: initial }: { messages: Message[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const unread = messages.filter((m) => !m.read).length;

  async function toggleRead(msg: Message) {
    setBusy(msg.id);
    try {
      await fetch(`/api/admin/messages/${msg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: !msg.read }),
      });
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, read: !m.read } : m));
    } finally { setBusy(null); }
  }

  async function deleteMessage(id: number) {
    if (!confirm("Delete this message?")) return;
    setBusy(id);
    try {
      await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (expanded === id) setExpanded(null);
      router.refresh();
    } finally { setBusy(null); }
  }

  function openMessage(msg: Message) {
    setExpanded(expanded === msg.id ? null : msg.id);
    // Auto-mark as read on open
    if (!msg.read) toggleRead(msg);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Enquiries</p>
          <h1>Messages {unread > 0 && <span style={{ fontSize: 16, fontWeight: 600, color: "var(--terracotta)", marginLeft: 8 }}>({unread} unread)</span>}</h1>
          <p>Contact form submissions from the website.</p>
        </div>
        <AdminHeaderActions />
      </header>

      <section className={styles.workspace}>
        {messages.length === 0 ? (
          <div style={{ padding: "80px 40px", textAlign: "center", color: "#9ca3af" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 16px", display: "block" }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p style={{ margin: 0, fontSize: 16 }}>No messages yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ borderBottom: "1px solid var(--line)", background: msg.read ? "var(--paper)" : "var(--cream)" }}>
                {/* Row */}
                <button
                  type="button"
                  onClick={() => openMessage(msg)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "16px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                >
                  {/* Unread dot */}
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: msg.read ? "transparent" : "var(--terracotta)", flexShrink: 0, border: msg.read ? "1.5px solid var(--line)" : "none" }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 14, color: "var(--ink)", fontWeight: msg.read ? 500 : 700 }}>{msg.name}</strong>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{msg.email}</span>
                      {msg.phone && <span style={{ fontSize: 12, color: "#6b7280" }}>{msg.phone}</span>}
                      <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 4, padding: "1px 7px", fontSize: 11, fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>
                        {subjectLabel[msg.subject] ?? msg.subject}
                      </span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 500 }}>
                      {msg.message}
                    </p>
                  </div>

                  <span style={{ fontSize: 12, color: "#9ca3af", flexShrink: 0 }}>
                    {new Date(msg.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>

                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" style={{ flexShrink: 0, transition: "transform 0.2s", transform: expanded === msg.id ? "rotate(180deg)" : "none" }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>

                {/* Expanded body */}
                {expanded === msg.id && (
                  <div style={{ padding: "0 24px 20px 46px", animation: "fadeIn 0.15s ease-out" }}>
                    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10, padding: "16px 18px", marginBottom: 12, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7, color: "var(--ink)" }}>
                      {msg.message}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <a href={`mailto:${msg.email}?subject=Re: ${msg.subject}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--terracotta)", color: "#fff", borderRadius: 7, padding: "8px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        Reply via Email
                      </a>
                      {msg.phone && (
                        <a href={`tel:${msg.phone}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--cream)", border: "1px solid var(--line)", color: "var(--ink)", borderRadius: 7, padding: "8px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          Call
                        </a>
                      )}
                      <button onClick={() => toggleRead(msg)} disabled={busy === msg.id}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--cream)", border: "1px solid var(--line)", color: "var(--ink)", borderRadius: 7, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        {msg.read ? "Mark unread" : "Mark read"}
                      </button>
                      <button onClick={() => deleteMessage(msg.id)} disabled={busy === msg.id}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff0f0", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 7, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
