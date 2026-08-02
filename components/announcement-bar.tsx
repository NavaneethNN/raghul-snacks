"use client";

import { useEffect, useState } from "react";

type Announcement = {
  id: number;
  text: string;
  icon: string | null;
};

// Module-level cache — fetched once per browser session, not on every navigation.
let cachedAnnouncements: Announcement[] | undefined = undefined;

export function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(cachedAnnouncements ?? []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(cachedAnnouncements === undefined);

  useEffect(() => {
    if (cachedAnnouncements !== undefined) return; // already have data
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
    }, 5000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  if (announcements.length === 0) {
    const text = loading ? "" : "Free delivery on orders above ₹499";
    const icon = loading ? null : "🚚";
    return (
      <div className="announcement">
        <div className="announcement-slider">
          <span className="announcement-item">
            {icon && <span className="announcement-icon">{icon}</span>}
            {text}
          </span>
        </div>
      </div>
    );
  }

  const current = announcements[currentIndex];
  return (
    <div className="announcement">
      <div className="announcement-slider">
        <span key={current.id} className="announcement-item">
          {current.icon && <span className="announcement-icon">{current.icon}</span>}
          {current.text}
        </span>
      </div>
    </div>
  );
}
