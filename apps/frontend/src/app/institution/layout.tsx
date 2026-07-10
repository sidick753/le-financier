"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { InstitutionSidebar } from "@/components/institution-sidebar";
import { NotificationsProvider } from "@/lib/notifications-context";
import { InstitutionBadgesProvider } from "@/lib/institution-badges-context";

export default function InstitutionLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/login");
    } else if (user.role !== "INSTITUTION") {
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

  if (user.role !== "INSTITUTION") {
    return null;
  }

  return (
    <NotificationsProvider>
      <InstitutionBadgesProvider>
        <div className="flex min-h-screen bg-slate-50">
          <InstitutionSidebar />
          <main className="ml-64 flex-1 overflow-y-auto">{children}</main>
        </div>
      </InstitutionBadgesProvider>
    </NotificationsProvider>
  );
}
