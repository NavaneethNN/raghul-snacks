"use client";

import { useEffect, useState } from "react";

type Announcement = {
  id: number;
  text: string;
  icon: string | null;
};

export function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Fetch announcements
    fetch("/api/announcements")
      .then((res) => res.json())
      .then((data) => setAnnouncements(data))
      .catch((err) => console.error("Failed to load announcements:", err));
  }, []);

  useEffect(() => {
    if (announcements.length === 0) return;

    // Auto-rotate announcements every 5 seconds
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [announcements.length]);

  if (announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];

  return (
    <div className="announcement">
      <div className="announcement-slider">
        <span key={currentAnnouncement.id} className="announcement-item">
          {currentAnnouncement.icon && (
            <span className="announcement-icon">{currentAnnouncement.icon}</span>
          )}
          {currentAnnouncement.text}
        </span>
      </div>
    </div>
  );
}
