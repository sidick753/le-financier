"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/lib/use-notifications";

// Le lien stocké côté backend peut être relatif ("/dashboard/offres?offer=xxx")
// ou absolu (FRONTEND_URL + chemin) selon l'environnement — on ne garde que le
// chemin + query pour router.push, quel que soit le format reçu.
function linkToPath(link: string): string {
  try {
    const url = new URL(link, window.location.origin);
    return `${url.pathname}${url.search}`;
  } catch {
    return link;
  }
}

type Category = "paiement" | "offre" | "systeme";

type TabKey = "toutes" | "non-lues" | "offres" | "paiements" | "systeme";

const TABS: { key: TabKey; label: string }[] = [
  { key: "toutes", label: "Toutes" },
  { key: "non-lues", label: "Non lues" },
  { key: "offres", label: "Offres" },
  { key: "paiements", label: "Paiements" },
  { key: "systeme", label: "Système" },
];

function classify(title: string): Category {
  if (/^paiement/i.test(title)) return "paiement";
  if (/offre|proposition|investissement|r[ée]ponse|opportunit/i.test(title)) return "offre";
  return "systeme";
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return "Hier";
  return `Il y a ${diffDays} jours`;
}

function CategoryIcon({ category }: { category: Category }) {
  if (category === "paiement") {
    return (
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </span>
    );
  }
  if (category === "offre") {
    return (
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </span>
  );
}

export function NotificationsPanel() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("toutes");

  function handleNotificationClick(notification: { id: string; link: string | null; readAt: string | null }) {
    if (!notification.readAt) markAsRead(notification.id);
    if (notification.link) router.push(linkToPath(notification.link));
  }

  const filtered = notifications.filter((notification) => {
    if (activeTab === "toutes") return true;
    if (activeTab === "non-lues") return !notification.readAt;
    const category = classify(notification.title);
    if (activeTab === "offres") return category === "offre";
    if (activeTab === "paiements") return category === "paiement";
    return category === "systeme";
  });

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-400 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div>
            <p className="text-[15px] font-black tracking-tight text-slate-900">Notifications</p>
            <p className="text-xs text-slate-500">
              {unreadCount > 0
                ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                : "Tout est à jour"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Tout marquer comme lu
          </button>
        )}
      </header>

      <div className="p-8">
        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                activeTab === tab.key
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {filtered.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-400">Aucune notification pour le moment.</p>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {filtered.map((notification) => {
              const isUnread = !notification.readAt;
              const category = classify(notification.title);
              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex w-full items-start gap-4 p-5 text-left transition hover:bg-slate-50 ${
                    isUnread ? "bg-blue-50/60" : ""
                  }`}
                >
                  <CategoryIcon category={category} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                      {isUnread && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" />}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">{notification.body}</p>
                  </div>
                  <span className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-slate-400">
                    {formatRelativeTime(notification.createdAt)}
                    {notification.link && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
