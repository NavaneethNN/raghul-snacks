"use client";

import { useEffect, useRef, useState } from "react";

type Announcement = {
  id: number;
  text: string;
  icon: string | null;
};

let cachedAnnouncements: Announcement[] | undefined = undefined;

function renderAnnouncementIcon(icon: string | null) {
  if (!icon) return null;
  if (icon === "🚚" || icon === "truck") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6 }}>
        <rect x="1" y="3" width="15" height="13"></rect>
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
        <circle cx="5.5" cy="18.5" r="2.5"></circle>
        <circle cx="18.5" cy="18.5" r="2.5"></circle>
      </svg>
    );
  }
  return <span className="announcement-icon">{icon}</span>;
}

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
        {renderAnnouncementIcon(icon)}
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
    const icon = loading ? null : "truck";
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
