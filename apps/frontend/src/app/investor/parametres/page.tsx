"use client";

import { useState } from "react";
import { NotifBell } from "@/components/ui/notif-bell";
import { PersonalProfileSection } from "@/components/ui/personal-profile-section";
import { PasswordSecuritySection } from "@/components/ui/password-security-section";
import { IdentityDocumentSection } from "@/components/identity-document-section";

type Tab = "profil" | "securite";

const TABS: { id: Tab; label: string }[] = [
  { id: "profil", label: "Mon profil" },
  { id: "securite", label: "Sécurité" },
];

export default function InvestorParametresPage() {
  const [tab, setTab] = useState<Tab>("profil");

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[18px] font-bold tracking-tight text-slate-900">Paramètres</p>
          <p className="text-xs text-slate-500">Configuration de votre compte investisseur</p>
        </div>
        <NotifBell href="/investor/notifications" />
      </header>

      <div className="p-8 pb-16">
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

        {tab === "profil" && (
          <>
            <PersonalProfileSection showCni />
            <IdentityDocumentSection />
          </>
        )}
        {tab === "securite" && <PasswordSecuritySection />}
      </div>
    </>
  );
}
