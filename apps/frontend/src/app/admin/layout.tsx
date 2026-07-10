"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AdminSidebar } from "@/components/admin-sidebar";
import { NotificationsProvider } from "@/lib/notifications-context";
import { AdminBadgesProvider } from "@/lib/admin-badges-context";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/login");
    } else if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      router.push("/dashboard");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-[13px] text-slate-400">Chargement...</p>
      </div>
    );
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <NotificationsProvider>
      <AdminBadgesProvider>
        <div className="flex min-h-screen bg-slate-50">
          <AdminSidebar />
          <main className="ml-64 flex-1 overflow-y-auto">{children}</main>
        </div>
      </AdminBadgesProvider>
    </NotificationsProvider>
  );
}
