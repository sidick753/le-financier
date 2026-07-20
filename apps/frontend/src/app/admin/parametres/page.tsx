"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { PersonalProfileSection } from "@/components/ui/personal-profile-section";
import { PasswordSecuritySection } from "@/components/ui/password-security-section";

type Tab = "profil" | "securite";

const TABS: { id: Tab; label: string }[] = [
  { id: "profil", label: "Mon profil" },
  { id: "securite", label: "Sécurité" },
];

export default function AdminParametresPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("profil");

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Paramètres</h1>
          <p className="mt-1 text-sm text-gray-500">Configuration de votre compte {user?.role === "SUPER_ADMIN" ? "super admin" : "admin"}.</p>
        </div>
      </div>

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
      {tab === "securite" && <PasswordSecuritySection />}
    </div>
  );
}
