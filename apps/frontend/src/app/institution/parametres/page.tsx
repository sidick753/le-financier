"use client";

import { useEffect, useState } from "react";
import { useInstitutionSettings } from "@/lib/use-institution-settings";

type Tab = "institution" | "limites" | "securite";

const INPUT =
  "w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900";

const SECTEURS_DISPONIBLES = ["Tabac", "Armement", "Jeux", "Alcool"];

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

export default function InstitutionParametresPage() {
  const { institution, isLoading, updateProfile, updateLimits, regenerateApiKey, changePassword } =
    useInstitutionSettings();
  const [tab, setTab] = useState<Tab>("institution");

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

  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmerMotDePasse, setConfirmerMotDePasse] = useState("");
  const [showMotDePasseActuel, setShowMotDePasseActuel] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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
    setEnveloppeMax(institution.envelopeMax ?? "");
    setTicketMin(institution.ticketMin ?? "");
    setTicketMax(institution.ticketMax ?? "");
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
      envelopeMax: enveloppeMax ? Number(enveloppeMax) : undefined,
      ticketMin: ticketMin ? Number(ticketMin) : undefined,
      ticketMax: ticketMax ? Number(ticketMax) : undefined,
      excludedSectors: Object.keys(secteursExclus).filter((s) => secteursExclus[s]),
    });
    setSavedLimites(true);
    setTimeout(() => setSavedLimites(false), 2000);
  }

  async function handleChangePassword() {
    setPasswordError(null);
    setPasswordSuccess(false);
    if (nouveauMotDePasse !== confirmerMotDePasse) {
      setPasswordError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    try {
      await changePassword(motDePasseActuel, nouveauMotDePasse);
      setMotDePasseActuel("");
      setNouveauMotDePasse("");
      setConfirmerMotDePasse("");
      setPasswordSuccess(true);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Erreur inconnue.");
    }
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
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-500">Configuration de votre compte institutionnel</p>
      </div>

      <div className="mb-6 flex gap-6 border-b border-gray-200">
        {[
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

      {tab === "institution" && (
        <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6">
          <p className="mb-4 text-sm font-semibold text-gray-900">Informations institutionnelles</p>
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
          <p className="mb-4 text-sm font-semibold text-gray-900">Limites & Mandats d'investissement</p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Enveloppe annuelle max (FCFA)</label>
              <input value={enveloppeMax} onChange={(e) => setEnveloppeMax(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Ticket minimum (FCFA)</label>
              <input value={ticketMin} onChange={(e) => setTicketMin(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Ticket maximum (FCFA)</label>
              <input value={ticketMax} onChange={(e) => setTicketMax(e.target.value)} className={INPUT} />
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
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="mb-4 text-sm font-semibold text-gray-900">Changement de mot de passe admin</p>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Mot de passe actuel</label>
                <div className="relative">
                  <input
                    type={showMotDePasseActuel ? "text" : "password"}
                    value={motDePasseActuel}
                    onChange={(e) => setMotDePasseActuel(e.target.value)}
                    className={`${INPUT} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowMotDePasseActuel((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <EyeIcon />
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={nouveauMotDePasse}
                  onChange={(e) => setNouveauMotDePasse(e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={confirmerMotDePasse}
                  onChange={(e) => setConfirmerMotDePasse(e.target.value)}
                  className={INPUT}
                />
              </div>
              {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
              {passwordSuccess && <p className="text-xs text-green-600">✓ Mot de passe mis à jour.</p>}
              <button
                onClick={handleChangePassword}
                className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
              >
                Changer le mot de passe
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="mb-2 text-sm font-semibold text-gray-900">Clé API</p>
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
  );
}
