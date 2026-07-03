"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/use-notifications";

const NAV_ITEMS = [
  { href: "/institution", label: "Vue d'ensemble", icon: "📊" },
  { href: "/institution/deal-flow", label: "Deal Flow", icon: "🔍", badge: true },
  { href: "/institution/portefeuille", label: "Portefeuille", icon: "🏛️" },
  { href: "/institution/risques", label: "Risques & Conformité", icon: "⚖️", alert: true },
  { href: "/institution/equipe", label: "Équipe", icon: "👥" },
];

export function InstitutionSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-xs font-bold text-white">
          LF
        </div>
        <p className="mt-3 text-sm font-semibold text-gray-900">
          {user?.firstName} {user?.lastName}
        </p>
        <div className="mt-1 flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-xs text-green-600">Institution vérifiée</span>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/institution"
              ? pathname === "/institution"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-brand-50 font-medium text-brand-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span>{item.icon}</span>
                {item.label}
              </div>
              {item.badge && unreadCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-xs text-white">
                  {unreadCount}
                </span>
              )}
              {item.alert && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  2
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-gray-100 p-3">
        <Link href="/institution/parametres" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          ⚙️ Paramètres
        </Link>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
        >
          🚪 Déconnexion
        </button>
      </div>
    </aside>
  );
}
