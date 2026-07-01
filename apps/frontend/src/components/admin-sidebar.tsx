"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/use-notifications";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/pme", label: "Gestion PME", icon: "🏢" },
  { href: "/admin/investisseurs", label: "Investisseurs", icon: "👥" },
  { href: "/admin/opportunites", label: "Opportunités", icon: "📋" },
  { href: "/admin/partenaires", label: "Partenaires", icon: "🤝" },
  { href: "/admin/scoring", label: "Moteur scoring", icon: "⭐" },
  { href: "/admin/litiges", label: "Litiges", icon: "⚖️" },
  { href: "/admin/finances", label: "Finances", icon: "💰" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-xs font-bold text-white">
          LF
        </div>
        <p className="mt-3 text-sm font-semibold text-gray-900">
          {user?.firstName} {user?.lastName}
        </p>
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          {user?.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          const showBadge =
            item.href === "/admin/notifications" && unreadCount > 0;
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
              <span className="flex items-center gap-3">
                <span>{item.icon}</span>
                {item.label}
              </span>
              {showBadge && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-gray-200 p-3">
        <Link
          href="/admin/parametres"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
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
