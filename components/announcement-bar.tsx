"use client";

import { useEffect, useRef, useState } from "react";

type Announcement = {
  id: number;
  text: string;
  icon: string | null;
};

let cachedAnnouncements: Announcement[] | undefined = undefined;

function AnnouncementItem({ text, icon }: { text: string; icon: string | null }) {
  const itemRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMarquee, setIsMarquee] = useState(false);

  useEffect(() => {
    function check() {
      const item = itemRef.current;
      const container = containerRef.current;
      if (item && container) {
        setIsMarquee(item.scrollWidth > container.clientWidth);
      }
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [text]);

  return (
    <div ref={containerRef} className="announcement-slider">
      <span ref={itemRef} className={`announcement-item${isMarquee ? " marquee" : ""}`}>
        {icon && <span className="announcement-icon">{icon}</span>}
        {text}
      </span>
    </div>
  );
}

export function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(cachedAnnouncements ?? []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(cachedAnnouncements === undefined);

  useEffect(() => {
    if (cachedAnnouncements !== undefined) return;
    fetch("/api/announcements")
      .then((res) => res.json())
      .then((data: Announcement[]) => {
        cachedAnnouncements = data;
        setAnnouncements(data);
        setLoading(false);
      })
      .catch(() => {
        cachedAnnouncements = [];
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  if (announcements.length === 0) {
    const text = loading ? "" : "Free delivery on orders above ₹499";
    const icon = loading ? null : "🚚";
    return (
      <div className="announcement">
        <AnnouncementItem text={text} icon={icon} />
      </div>
    );
  }

  const current = announcements[currentIndex];
  return (
    <div className="announcement">
      <AnnouncementItem key={current.id} text={current.text} icon={current.icon} />
    </div>
  );
}
