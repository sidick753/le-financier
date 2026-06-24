"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./auth-context";
import { api } from "./api";

interface Notification {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4201";

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  useEffect(() => {
    if (!token) return;

    api
      .get<Notification[]>("/notifications", token)
      .then(setNotifications)
      .catch(() => {});

    const socket: Socket = io(SOCKET_URL, { auth: { token } });

    socket.on("notification", (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  async function markAsRead(id: string) {
    if (!token) return;
    const previous = notifications.find((n) => n.id === id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    try {
      await api.patch(`/notifications/${id}/read`, {}, token);
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: previous?.readAt ?? null } : n)),
      );
    }
  }

  async function markAllAsRead() {
    if (!token) return;
    const unread = notifications.filter((n) => !n.readAt);
    if (unread.length === 0) return;
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    try {
      await Promise.all(unread.map((n) => api.patch(`/notifications/${n.id}/read`, {}, token)));
    } catch {
      setNotifications((prev) =>
        prev.map((n) => {
          const wasUnread = unread.some((u) => u.id === n.id);
          return wasUnread ? { ...n, readAt: null } : n;
        }),
      );
    }
  }

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications doit être utilisé dans un NotificationsProvider.");
  return ctx;
}
