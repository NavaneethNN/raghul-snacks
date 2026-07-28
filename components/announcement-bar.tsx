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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch announcements
    fetch("/api/announcements")
      .then((res) => res.json())
      .then((data) => {
        setAnnouncements(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load announcements:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (announcements.length === 0) return;

    // Auto-rotate announcements every 5 seconds
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [announcements.length]);

  // Show default announcement while loading or if no announcements
  if (announcements.length === 0) {
    const defaultAnnouncement = loading
      ? { id: 0, text: "Loading...", icon: null }
      : { id: 0, text: "Free delivery on orders above ₹499", icon: "🚚" };
    return (
      <div className="announcement">
        <div className="announcement-slider">
          <span key={defaultAnnouncement.id} className="announcement-item">
            {defaultAnnouncement.icon && (
              <span className="announcement-icon">{defaultAnnouncement.icon}</span>
            )}
            {defaultAnnouncement.text}
          </span>
        </div>
      </div>
    );
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
