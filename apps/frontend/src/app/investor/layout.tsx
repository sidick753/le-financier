"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { InvestorSidebar } from "@/components/investor-sidebar";
import { NotificationsProvider } from "@/lib/notifications-context";

export default function InvestorLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-[13px] text-slate-400">Chargement...</p>
      </div>
    );
  }

  return (
    <NotificationsProvider>
      <div className="flex h-screen bg-slate-50">
        <InvestorSidebar />
        <main className="ml-64 flex-1 overflow-y-auto">{children}</main>
      </div>
    </NotificationsProvider>
  );
}
