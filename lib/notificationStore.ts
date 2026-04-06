"use client";

import { create } from "zustand";

export type ToastTone = "success" | "info" | "warning" | "error";

export interface AppNotification {
  id: string;
  message: string;
  tone: ToastTone;
}

interface NotificationState {
  notifications: AppNotification[];
  pushNotification: (message: string, tone?: ToastTone, timeoutMs?: number) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  pushNotification: (message, tone = "success", timeoutMs = 2600) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({
      notifications: [...state.notifications, { id, message, tone }],
    }));

    if (timeoutMs > 0) {
      window.setTimeout(() => {
        get().removeNotification(id);
      }, timeoutMs);
    }
  },
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((note) => note.id !== id),
    }));
  },
}));
