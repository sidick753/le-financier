"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./auth-context";
import { api } from "./api";

interface Notification {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAllAsReadForLink: (link: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4201";

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  useEffect(() => {
    if (!token) return;

    const refetch = () => {
      api
        .get<Notification[]>("/notifications", token)
        .then(setNotifications)
        .catch(() => {});
    };

    refetch();

    // auth en callback (pas un objet figé) : relu à chaque tentative de reconnexion
    // automatique de socket.io-client (ex: après un redémarrage du backend), pour éviter
    // de retenter indéfiniment avec un access token expiré.
    const socket: Socket = io(SOCKET_URL, {
      auth: (cb) => cb({ token: sessionStorage.getItem("accessToken") ?? token }),
    });

    // Toute notification émise pendant une coupure (redémarrage backend, veille,
    // perte réseau...) n'arrive jamais via l'event "notification" — resynchroniser
    // par un refetch complet à chaque (re)connexion évite d'avoir à recharger la
    // page pour les voir apparaître.
    socket.on("connect", refetch);

    // "io server disconnect" (redémarrage/déploiement backend) est le seul cas où
    // socket.io-client ne retente PAS la reconnexion automatiquement — sans ce
    // rappel manuel, le socket reste mort en silence et plus aucune notification
    // n'arrive tant que la page n'est pas rechargée.
    socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
        socket.connect();
      }
    });

    socket.on("notification", (notification: Notification) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notification.id)) return prev;
        return [notification, ...prev];
      });
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

  async function markAllAsReadForLink(link: string) {
    if (!token) return;
    const unread = notifications.filter((n) => !n.readAt && n.link?.includes(link));
    if (unread.length === 0) return;
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (unread.some((u) => u.id === n.id) ? { ...n, readAt: now } : n)),
    );
    try {
      await Promise.all(unread.map((n) => api.patch(`/notifications/${n.id}/read`, {}, token)));
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (unread.some((u) => u.id === n.id) ? { ...n, readAt: null } : n)),
      );
    }
  }

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, markAllAsReadForLink }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications doit être utilisé dans un NotificationsProvider.");
  return ctx;
}
