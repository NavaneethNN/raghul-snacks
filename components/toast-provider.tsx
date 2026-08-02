"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastContextValue = { show: (message: string, duration?: number) => void };
const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, duration = 2200) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), duration);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: "28px",
          left: "50%",
          transform: `translateX(-50%) translateY(${visible ? "0" : "20px"})`,
          background: "var(--ink, #243127)",
          color: "#fff",
          padding: "11px 22px",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: 500,
          zIndex: 99998,
          opacity: visible ? 1 : 0,
          pointerEvents: "none",
          transition: "opacity 0.22s ease, transform 0.22s ease",
          whiteSpace: "nowrap",
          boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
          fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)",
        }}
      >
        {message}
      </div>
    </ToastContext.Provider>
  );
}
