"use client";

import { useEffect } from "react";

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = "Delete", danger = true }: Props) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--paper)",
          borderRadius: 12,
          padding: "28px 24px 22px",
          maxWidth: 360,
          width: "100%",
          boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: danger ? "#fee2e2" : "#fef3c7",
          color: danger ? "#dc2626" : "#d97706",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        <p style={{ margin: "0 0 22px", fontSize: 15, color: "var(--ink)", lineHeight: 1.6, fontWeight: 500 }}>
          {message}
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "10px 0",
              background: "var(--cream)", border: "1.5px solid var(--line)",
              borderRadius: 8, font: "600 13px 'DM Sans',sans-serif",
              color: "var(--ink)", cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: "10px 0",
              background: danger ? "#dc2626" : "var(--terracotta)",
              border: "none",
              borderRadius: 8, font: "600 13px 'DM Sans',sans-serif",
              color: "#fff", cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
