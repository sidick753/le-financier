"use client";

import { useNotifications } from "@/lib/use-notifications";

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays === 1) return "Hier";
  return `Il y a ${diffDays} jours`;
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
              : "Tout est à jour"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-brand-700 hover:underline"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        {notifications.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-400">Aucune notification pour le moment.</p>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {notifications.map((notification) => {
            const isUnread = !notification.readAt;
            return (
              <button
                key={notification.id}
                onClick={() => isUnread && markAsRead(notification.id)}
                className={`flex w-full items-start gap-4 p-5 text-left transition hover:bg-gray-50 ${
                  isUnread ? "bg-brand-50/40" : ""
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                    isUnread ? "bg-brand-700" : "bg-transparent"
                  }`}
                />
                <div className="flex-1">
                  <p
                    className={`text-sm ${
                      isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                    }`}
                  >
                    {notification.title}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">{notification.body}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                </div>
                {isUnread && (
                  <span className="flex-shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                    Nouveau
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
