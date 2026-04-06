"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Zap, Trophy, Users, MessageSquare, X } from "lucide-react";

interface Notification {
  id: string;
  type: "achievement" | "challenge" | "friend" | "message";
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  icon: React.ReactNode;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "achievement",
    title: "Streak Milestone!",
    description: "You've reached a 12-day quiz streak!",
    timestamp: "2 minutes ago",
    isRead: false,
    icon: <Zap className="h-4 w-4 text-amber-500" />,
  },
  {
    id: "2",
    type: "challenge",
    title: "Challenge from NovaByte",
    description: "NovaByte challenged you to a 1v1 Science quiz",
    timestamp: "15 minutes ago",
    isRead: false,
    icon: <Trophy className="h-4 w-4 text-violet-500" />,
  },
  {
    id: "3",
    type: "friend",
    title: "EchoDrift joined!",
    description: "Your friend EchoDrift joined the platform",
    timestamp: "1 hour ago",
    isRead: true,
    icon: <Users className="h-4 w-4 text-blue-500" />,
  },
  {
    id: "4",
    type: "message",
    title: "New Message from PixelSage",
    description: "Hey! Want to team up for the battle royale?",
    timestamp: "3 hours ago",
    isRead: true,
    icon: <MessageSquare className="h-4 w-4 text-green-500" />,
  },
];

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleRemoveNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="View notifications"
        onClick={() => setIsOpen(!isOpen)}
        className="focus-ring arcade-btn relative rounded-full border border-black/10 p-2 text-[var(--text-secondary)] hover:border-violet-400 hover:text-violet-500 dark:border-white/10 dark:text-white/80 dark:hover:text-violet-200 transition-colors duration-150"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="absolute top-0 right-0 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-xs font-semibold text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-80 rounded-card border dark:border-white/10 border-gray-200 dark:bg-[#1A1B2E] bg-white shadow-lg dark:shadow-2xl"
          >
            {/* Header */}
            <div className="border-b dark:border-white/10 border-gray-200 px-4 py-3 flex items-center justify-between">
              <p className="font-sora font-semibold text-[var(--text-primary)]">
                Notifications
              </p>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-8 w-8 mb-2 text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    No notifications yet
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className={`border-b dark:border-white/5 border-gray-100 p-4 transition-colors duration-100 ${
                      !notification.isRead
                        ? "dark:bg-violet-500/5 bg-violet-50"
                        : "hover:dark:bg-white/5 hover:bg-gray-50"
                    }`}
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{notification.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {notification.title}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {notification.description}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {notification.timestamp}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveNotification(notification.id);
                        }}
                        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                        aria-label="Dismiss notification"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t dark:border-white/10 border-gray-200 px-4 py-3">
                <button
                  type="button"
                  className="w-full text-center text-sm text-violet-600 dark:text-violet-400 hover:text-violet-500 font-medium transition-colors"
                >
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
