"use client";

import { useEffect, useState } from "react";
import { useAccountProfile } from "@/lib/use-account-profile";
import { inputGrayCls } from "./form-styles";
import { FieldError } from "./field-error";
import { alertError, alertSuccess } from "@/lib/alert";

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
  const [errors, setErrors] = useState<{ firstName?: boolean; lastName?: boolean }>({});

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setPhone(profile.phone ?? "");
    setCniNumber(profile.cniNumber ?? "");
  }, [profile]);

  async function handleSave() {
    const newErrors: { firstName?: boolean; lastName?: boolean } = {};
    if (!firstName.trim()) newErrors.firstName = true;
    if (!lastName.trim()) newErrors.lastName = true;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSaving(true);
    try {
      await updateProfile({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        cniNumber: showCni ? cniNumber || undefined : undefined,
      });
      alertSuccess("Profil enregistré.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !profile) {
    return <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-400">Chargement...</div>;
  }

  return (
    <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6">
      <p className="mb-1 text-lg font-bold text-gray-900">Informations personnelles</p>
      <p className="mb-4 text-xs text-gray-500">Votre identité, utilisée pour vous contacter et vous identifier sur la plateforme.</p>

      {profile.kycStatus === "REJECTED" && profile.kycRejectionReason && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-semibold text-red-700">Vérification d&apos;identité rejetée</p>
          <p className="mt-0.5 text-xs text-red-600">Motif : {profile.kycRejectionReason}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Prénom</label>
            <input
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (errors.firstName) setErrors((er) => ({ ...er, firstName: false }));
              }}
              className={inputGrayCls(errors.firstName)}
            />
            <FieldError msg="Le prénom est requis." show={!!errors.firstName} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Nom</label>
            <input
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (errors.lastName) setErrors((er) => ({ ...er, lastName: false }));
              }}
              className={inputGrayCls(errors.lastName)}
            />
            <FieldError msg="Le nom est requis." show={!!errors.lastName} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Email</label>
          <input value={profile.email} disabled className={`${inputGrayCls()} cursor-not-allowed text-gray-400`} />
          <p className="mt-1 text-xs text-gray-400">Identifiant de connexion — non modifiable.</p>
        </div>
        <div className={showCni ? "grid grid-cols-2 gap-4" : ""}>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Téléphone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex : +225 07 00 00 00 00" className={inputGrayCls()} />
          </div>
          {showCni && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Numéro de CNI</label>
              <input value={cniNumber} onChange={(e) => setCniNumber(e.target.value)} className={inputGrayCls()} />
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
