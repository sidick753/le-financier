"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { PersonalProfileSection } from "@/components/ui/personal-profile-section";
import { PasswordSecuritySection } from "@/components/ui/password-security-section";
import { PushNotificationsSection } from "@/components/ui/push-notifications-section";
import { NotifBell } from "@/components/ui/notif-bell";

type Tab = "profil" | "securite";

const TABS: { id: Tab; label: string }[] = [
  { id: "profil", label: "Mon profil" },
  { id: "securite", label: "Sécurité" },
];

export default function AdminParametresPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("profil");

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[15px] font-black tracking-tight text-gray-900">Paramètres</p>
          <p className="text-xs text-gray-500">Configuration de votre compte {user?.role === "SUPER_ADMIN" ? "super admin" : "admin"}.</p>
        </div>
        <NotifBell href="/admin/notifications" />
      </header>

      <div className="p-8">
      <div className="mb-6 flex gap-6 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-3 text-sm font-medium transition ${
              tab === t.id
                ? "border-b-2 border-brand-700 text-brand-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profil" && <PersonalProfileSection />}
      {tab === "securite" && (
        <div className="space-y-6">
          <PasswordSecuritySection />
          <PushNotificationsSection />
        </div>
      )}
      </div>
    </>
  );
}
