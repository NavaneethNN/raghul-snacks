"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ToastOptions = { duration?: number; href?: string };
type ToastContextValue = { show: (message: string, durationOrOptions?: number | ToastOptions) => void };
const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const [href, setHref] = useState<string | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, durationOrOptions: number | ToastOptions = 2200) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const opts: ToastOptions =
      typeof durationOrOptions === "number"
        ? { duration: durationOrOptions }
        : durationOrOptions;
    const duration = opts.duration ?? 2200;
    setMessage(msg);
    setHref(opts.href);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), duration);
  }, []);

  function handleClick() {
    if (href) {
      setVisible(false);
      router.push(href);
    }
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        onClick={href ? handleClick : undefined}
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
          pointerEvents: visible ? "auto" : "none",
          transition: "opacity 0.22s ease, transform 0.22s ease",
          whiteSpace: "nowrap",
          boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
          fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)",
          cursor: href ? "pointer" : "default",
        }}
      >
        {message}
      </div>
    </ToastContext.Provider>
  );
}
