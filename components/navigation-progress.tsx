"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

// Inner component needs to be wrapped in Suspense because useSearchParams
// opts the component into dynamic rendering at the page boundary.
function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Detect navigation start by intercepting link clicks before the route change
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as Element).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      // Only trigger for internal same-origin navigation
      if (!href || href.startsWith("http") || href.startsWith("//") || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      // Don't trigger if it opens in a new tab
      if (target.target === "_blank") return;

      // Start the bar
      setWidth(20);
      setVisible(true);
      // Creep toward 90% while waiting for the route to resolve
      timerRef.current = setTimeout(() => setWidth(60), 200);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Complete the bar when the route finishes
  useEffect(() => {
    if (!visible) return;
    // Clear the creep timer
    if (timerRef.current) clearTimeout(timerRef.current);
    // Shoot to 100%
    setWidth(100);
    // Then hide after the fill animation completes
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 350);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  if (!visible && width === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        zIndex: 99999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          background: "var(--terracotta, #c95f3b)",
          transitionProperty: "width, opacity",
          transitionDuration: width === 100 ? "0.25s" : "1.8s",
          transitionTimingFunction: "ease-out",
          boxShadow: "0 0 8px var(--terracotta, #c95f3b)",
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <ProgressBar />
    </Suspense>
  );
}
