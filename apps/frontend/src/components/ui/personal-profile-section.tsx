"use client";

import { useEffect, useState } from "react";
import { useAccountProfile } from "@/lib/use-account-profile";
import { INPUT_GRAY } from "./form-styles";

// Bloc "Mon profil" — identité personnelle de l'utilisateur connecté, commun
// aux 4 rôles (PME_OWNER, INVESTOR, INSTITUTION, ADMIN). Distinct du profil de
// l'entité (Organization / Institution) affiché ailleurs sur la page.
export function PersonalProfileSection({ showCni = false }: { showCni?: boolean }) {
  const { profile, isLoading, updateProfile } = useAccountProfile();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [cniNumber, setCniNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setPhone(profile.phone ?? "");
    setCniNumber(profile.cniNumber ?? "");
  }, [profile]);

  async function handleSave() {
    setIsSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateProfile({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        cniNumber: showCni ? cniNumber || undefined : undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !profile) {
    return <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">Chargement...</div>;
  }

  return (
    <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6">
      <p className="mb-1 text-sm font-semibold text-gray-900">Informations personnelles</p>
      <p className="mb-4 text-xs text-gray-500">Votre identité, utilisée pour vous contacter et vous identifier sur la plateforme.</p>

      {error && <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {saved && <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">Profil enregistré.</div>}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Prénom</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={INPUT_GRAY} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Nom</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={INPUT_GRAY} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Email</label>
          <input value={profile.email} disabled className={`${INPUT_GRAY} cursor-not-allowed text-gray-400`} />
          <p className="mt-1 text-xs text-gray-400">Identifiant de connexion — non modifiable.</p>
        </div>
        <div className={showCni ? "grid grid-cols-2 gap-4" : ""}>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Téléphone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex : +225 07 00 00 00 00" className={INPUT_GRAY} />
          </div>
          {showCni && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Numéro de CNI</label>
              <input value={cniNumber} onChange={(e) => setCniNumber(e.target.value)} className={INPUT_GRAY} />
            </div>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {isSaving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
