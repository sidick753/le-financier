"use client";

import { useEffect, useState } from "react";
import { useInstitutionSettings } from "@/lib/use-institution-settings";
import { NotifBell } from "@/components/ui/notif-bell";
import { PersonalProfileSection } from "@/components/ui/personal-profile-section";
import { PasswordSecuritySection } from "@/components/ui/password-security-section";
import { PushNotificationsSection } from "@/components/ui/push-notifications-section";
import { EyeIcon } from "@/components/ui/eye-icon";
import { INPUT_GRAY as INPUT } from "@/components/ui/form-styles";
import { formatAmountInput, parseAmountInput } from "@/lib/admin-ui";

type Tab = "profil" | "institution" | "limites" | "securite";

const SECTEURS_DISPONIBLES = ["Tabac", "Armement", "Jeux", "Alcool"];

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

export default function InstitutionParametresPage() {
  const { institution, isLoading, updateProfile, updateLimits, regenerateApiKey } =
    useInstitutionSettings();
  const [tab, setTab] = useState<Tab>("profil");

  const [nomInstitution, setNomInstitution] = useState("");
  const [type, setType] = useState("");
  const [agrementBceao, setAgrementBceao] = useState("");
  const [pays, setPays] = useState("");
  const [adresse, setAdresse] = useState("");
  const [emailInstitutionnel, setEmailInstitutionnel] = useState("");
  const [telephone, setTelephone] = useState("");
  const [savedInstitution, setSavedInstitution] = useState(false);

  const [enveloppeMax, setEnveloppeMax] = useState("");
  const [ticketMin, setTicketMin] = useState("");
  const [ticketMax, setTicketMax] = useState("");
  const [secteursExclus, setSecteursExclus] = useState<Record<string, boolean>>({});
  const [savedLimites, setSavedLimites] = useState(false);

  const [revealedApiKey, setRevealedApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (!institution) return;
    setNomInstitution(institution.name ?? "");
    setType(institution.type ?? "");
    setAgrementBceao(institution.bceaoApprovalNumber ?? "");
    setPays(institution.country ?? "");
    setAdresse(institution.address ?? "");
    setEmailInstitutionnel(institution.contactEmail ?? "");
    setTelephone(institution.contactPhone ?? "");
    setEnveloppeMax(institution.envelopeMax ? formatAmountInput(institution.envelopeMax) : "");
    setTicketMin(institution.ticketMin ? formatAmountInput(institution.ticketMin) : "");
    setTicketMax(institution.ticketMax ? formatAmountInput(institution.ticketMax) : "");
    setSecteursExclus(
      Object.fromEntries(SECTEURS_DISPONIBLES.map((s) => [s, institution.excludedSectors.includes(s)])),
    );
  }, [institution]);

  async function handleSaveInstitution() {
    await updateProfile({
      name: nomInstitution,
      type,
      bceaoApprovalNumber: agrementBceao,
      country: pays,
      address: adresse,
      contactEmail: emailInstitutionnel,
      contactPhone: telephone,
    });
    setSavedInstitution(true);
    setTimeout(() => setSavedInstitution(false), 2000);
  }

  async function handleSaveLimites() {
    await updateLimits({
      envelopeMax: enveloppeMax ? parseAmountInput(enveloppeMax) : undefined,
      ticketMin: ticketMin ? parseAmountInput(ticketMin) : undefined,
      ticketMax: ticketMax ? parseAmountInput(ticketMax) : undefined,
      excludedSectors: Object.keys(secteursExclus).filter((s) => secteursExclus[s]),
    });
    setSavedLimites(true);
    setTimeout(() => setSavedLimites(false), 2000);
  }

  async function handleRegenerateKey() {
    const plainKey = await regenerateApiKey();
    if (plainKey) {
      setRevealedApiKey(plainKey);
      setShowApiKey(true);
    }
  }

  if (isLoading || !institution) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-400">Chargement...</p>
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-15 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[18px] font-bold tracking-tight text-slate-900">Paramètres</p>
          <p className="text-xs text-slate-500">Configuration de votre compte institutionnel</p>
        </div>
        <NotifBell href="/institution/notifications" />
      </header>

      <div className="p-8 pb-16">
        <div className="mb-6 flex gap-6 border-b border-gray-200">
        {[
          { id: "profil", label: "Mon profil" },
          { id: "institution", label: "Institution" },
          { id: "limites", label: "Limites & Mandats" },
          { id: "securite", label: "Sécurité & API" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
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

      {tab === "institution" && (
        <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6">
          <p className="mb-4 text-base font-semibold text-gray-900">Informations institutionnelles</p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Nom de l'institution</label>
              <input value={nomInstitution} onChange={(e) => setNomInstitution(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Type</label>
              <input value={type} onChange={(e) => setType(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">N° Agrément BCEAO</label>
              <input value={agrementBceao} onChange={(e) => setAgrementBceao(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Pays</label>
              <input value={pays} onChange={(e) => setPays(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Adresse</label>
              <input value={adresse} onChange={(e) => setAdresse(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Email institutionnel</label>
              <input
                type="email"
                value={emailInstitutionnel}
                onChange={(e) => setEmailInstitutionnel(e.target.value)}
                className={INPUT}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Téléphone</label>
              <input value={telephone} onChange={(e) => setTelephone(e.target.value)} className={INPUT} />
            </div>
            <button
              onClick={handleSaveInstitution}
              className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              {savedInstitution ? "✓ Sauvegardé" : "Sauvegarder"}
            </button>
          </div>
        </div>
      )}

      {tab === "limites" && (
        <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6">
          <p className="mb-4 text-base font-semibold text-gray-900">Limites & Mandats d'investissement</p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Enveloppe annuelle max (FCFA)</label>
              <input
                inputMode="numeric"
                value={enveloppeMax}
                onChange={(e) => setEnveloppeMax(formatAmountInput(e.target.value))}
                className={INPUT}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Ticket minimum (FCFA)</label>
              <input
                inputMode="numeric"
                value={ticketMin}
                onChange={(e) => setTicketMin(formatAmountInput(e.target.value))}
                className={INPUT}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Ticket maximum (FCFA)</label>
              <input
                inputMode="numeric"
                value={ticketMax}
                onChange={(e) => setTicketMax(formatAmountInput(e.target.value))}
                className={INPUT}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-700">Secteurs exclus</label>
              <div className="grid grid-cols-2 gap-2">
                {SECTEURS_DISPONIBLES.map((secteur) => (
                  <label key={secteur} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={secteursExclus[secteur] ?? false}
                      onChange={() =>
                        setSecteursExclus((prev) => ({ ...prev, [secteur]: !prev[secteur] }))
                      }
                      className="h-4 w-4 rounded border-gray-300 accent-brand-700"
                    />
                    {secteur}
                  </label>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5">
              <p className="text-xs text-blue-800">
                ⓘ Ces limites sont contrôlées par LeFinancier pour la conformité BCEAO.
              </p>
            </div>
            <button
              onClick={handleSaveLimites}
              className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              {savedLimites ? "✓ Mis à jour" : "Mettre à jour"}
            </button>
          </div>
        </div>
      )}

      {tab === "securite" && (
        <div className="max-w-2xl space-y-5">
          <PasswordSecuritySection />
          <PushNotificationsSection />

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="mb-2 text-base font-semibold text-gray-900">Clé API</p>
            <p className="mb-3 text-xs text-gray-400">
              La clé API permet d'intégrer LeFinancier à votre système de gestion interne (core banking).
            </p>
            {revealedApiKey && (
              <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5">
                <p className="text-xs text-orange-800">
                  ⚠ Copiez cette clé maintenant — elle ne sera plus jamais affichée en clair.
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  readOnly
                  type={showApiKey ? "text" : "password"}
                  value={revealedApiKey ?? `••••••••••••${institution.apiKeyLastFour ?? "····"}`}
                  className={`${INPUT} pr-10 font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <EyeIcon />
                </button>
              </div>
              <button
                onClick={handleRegenerateKey}
                className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <RefreshIcon /> Régénérer
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
