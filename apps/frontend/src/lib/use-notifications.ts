"use client";

import { useEffect, useState } from "react";
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

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4201";

export function useNotifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  useEffect(() => {
    if (!token) return;

    api
      .get<Notification[]>("/notifications", token)
      .then(setNotifications)
      .catch(() => {});

    const socket: Socket = io(SOCKET_URL, {
      auth: { token },
    });

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

  return { notifications, unreadCount, markAsRead };
}
