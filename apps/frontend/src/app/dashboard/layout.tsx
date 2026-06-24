"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/sidebar";
import { usePmeData } from "@/lib/use-pme-data";
import { NotificationsProvider } from "@/lib/notifications-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { organization } = usePmeData();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Chargement...</p>
      </div>
    );
  }

  return (
    <NotificationsProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar organizationName={organization?.legalName ?? "Mon entreprise"} />
        <div className="ml-64 flex min-w-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </NotificationsProvider>
  );
}
