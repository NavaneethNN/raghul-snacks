"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const SEEN_KEY = "raghul-snacks-seen-replies";

type Message = { id: number; adminReply: string | null };

function getSeenIds(): Set<number> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch { return new Set(); }
}

function markAsSeen(ids: number[]) {
  try {
    const seen = getSeenIds();
    ids.forEach((id) => seen.add(id));
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch { /* ignore */ }
}

export function ReplyNotification() {
  const pathname = usePathname();
  const [unseenCount, setUnseenCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // When user opens account page, mark all current replies as seen
    if (pathname === "/account") {
      fetch("/api/messages/mine", { credentials: "include" })
        .then((r) => r.json())
        .then((d: { messages: Message[] }) => {
          const repliedIds = (d.messages ?? [])
            .filter((m) => m.adminReply)
            .map((m) => m.id);
          if (repliedIds.length) markAsSeen(repliedIds);
        })
        .catch(() => {});
      setVisible(false);
      setUnseenCount(0);
      return;
    }

    // Otherwise check for unseen replies
    let cancelled = false;
    async function check() {
      try {
        const sessionRes = await fetch("/api/auth/session", { credentials: "include" });
        const session = await sessionRes.json() as { account?: unknown };
        if (!session.account || cancelled) return;

        const msgRes = await fetch("/api/messages/mine", { credentials: "include" });
        const data = await msgRes.json() as { messages: Message[] };
        if (cancelled) return;

        const seen = getSeenIds();
        const unseen = (data.messages ?? []).filter((m) => m.adminReply && !seen.has(m.id));

        if (unseen.length > 0) {
          setUnseenCount(unseen.length);
          setVisible(true);
        }
      } catch { /* ignore */ }
    }

    check();
    return () => { cancelled = true; };
  }, [pathname]);

  function dismiss() {
    setVisible(false);
    // Don't mark as seen on dismiss — popup will reappear next page load until they visit account
  }

  if (!visible || unseenCount === 0) return null;

  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%",
      transform: "translateX(-50%)",
      background: "var(--ink)", color: "#fff",
      borderRadius: 10, padding: "14px 20px",
      display: "flex", alignItems: "center", gap: 14,
      zIndex: 9998, boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
      maxWidth: "min(480px, calc(100vw - 32px))", width: "100%",
      boxSizing: "border-box", animation: "slideUpIn 0.35s ease-out",
    }}>
      <style>{`@keyframes slideUpIn{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>

      {/* Envelope icon */}
      <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e5a52f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>
          {unseenCount === 1 ? "You have a reply to your message!" : `You have ${unseenCount} replies to your messages!`}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#b8c6a7" }}>Tap to view in your account.</p>
      </div>

      <Link
        href="/account"
        onClick={dismiss}
        style={{ background: "var(--terracotta)", color: "#fff", padding: "7px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}
      >
        View
      </Link>

      <button
        onClick={dismiss}
        style={{ background: "none", border: "none", color: "#b8c6a7", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", flexShrink: 0 }}
        aria-label="Dismiss"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}
