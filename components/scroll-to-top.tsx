"use client";

import { useEffect, Suspense, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Inner component uses useSearchParams which requires Suspense
function ScrollToTopInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const scrollToHashElement = useCallback((rawHash: string, smooth = true): boolean => {
    const cleanHash = rawHash.replace(/^#/, "").trim();
    if (!cleanHash) return false;
    const el = document.getElementById(cleanHash);
    if (el) {
      const headerOffset = 90;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: smooth ? "smooth" : "auto",
      });
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    // Check if there is a target hash in the current URL or saved in sessionStorage
    let targetHash = "";
    if (typeof window !== "undefined") {
      if (window.location.hash) {
        targetHash = window.location.hash.replace(/^#/, "");
      } else {
        try {
          const stored = sessionStorage.getItem("agy_pending_scroll_hash");
          if (stored) {
            targetHash = stored;
            sessionStorage.removeItem("agy_pending_scroll_hash");
          }
        } catch {
          // ignore session storage access error
        }
      }
    }

    if (targetHash) {
      // If target element is already present, scroll to it immediately
      if (!scrollToHashElement(targetHash, true)) {
        // Retry a few times in case dynamic sections (e.g. sliders, images) are still hydrating
        const timers = [50, 150, 300, 600].map((delay) =>
          setTimeout(() => {
            scrollToHashElement(targetHash, true);
          }, delay)
        );
        return () => {
          timers.forEach(clearTimeout);
        };
      }
      return;
    }

    // No target hash: scroll to top on route / search parameter changes
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, searchParams, scrollToHashElement]);

  useEffect(() => {
    // Intercept clicks on links targeting anchor IDs (e.g. "/#bestsellers" or "#categories")
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Check if href is an anchor link like "/#bestsellers" or "#bestsellers"
      const match = href.match(/^(?:\/|)#([a-zA-Z0-9_-]+)$/);
      if (!match) return;

      const targetId = match[1];
      if (!targetId) return;

      if (window.location.pathname === "/") {
        // Already on home page: smooth scroll directly without full page jump
        const el = document.getElementById(targetId);
        if (el) {
          e.preventDefault();
          const headerOffset = 90;
          const elementPosition = el.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: Math.max(0, offsetPosition), behavior: "smooth" });
          window.history.pushState(null, "", `/#${targetId}`);
        }
      } else {
        // On another page: save the pending hash so when home mounts, it scrolls smoothly to it
        try {
          sessionStorage.setItem("agy_pending_scroll_hash", targetId);
        } catch {
          // ignore
        }
      }
    };

    const handleHashChange = () => {
      if (window.location.hash) {
        scrollToHashElement(window.location.hash, true);
      }
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [scrollToHashElement]);

  return null;
}

export function ScrollToTop() {
  return (
    <Suspense fallback={null}>
      <ScrollToTopInner />
    </Suspense>
  );
}
