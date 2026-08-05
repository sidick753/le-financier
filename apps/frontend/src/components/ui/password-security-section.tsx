"use client";

import { useState } from "react";
import { useAccountProfile } from "@/lib/use-account-profile";
import { EyeIcon } from "./eye-icon";
import { inputGrayCls } from "./form-styles";
import { FieldError } from "./field-error";
import { alertSuccess } from "@/lib/alert";

// Bloc "Changement de mot de passe" — identique pour les 4 rôles (PME_OWNER,
// INVESTOR, INSTITUTION, ADMIN), tous authentifiés via /auth/change-password.
export function PasswordSecuritySection() {
  const { changePassword } = useAccountProfile();

  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmerMotDePasse, setConfirmerMotDePasse] = useState("");
  const [showMotDePasseActuel, setShowMotDePasseActuel] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [errors, setErrors] = useState<{ actuel?: string; nouveau?: string; confirmer?: string }>({});

  async function handleChangePassword() {
    const newErrors: typeof errors = {};
    if (!motDePasseActuel) newErrors.actuel = "Le mot de passe actuel est requis.";
    if (!nouveauMotDePasse || nouveauMotDePasse.length < 8) {
      newErrors.nouveau = "Le nouveau mot de passe doit contenir au moins 8 caractères.";
    }
    if (nouveauMotDePasse !== confirmerMotDePasse) {
      newErrors.confirmer = "Les deux mots de passe ne correspondent pas.";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsChangingPassword(true);
    try {
      await changePassword(motDePasseActuel, nouveauMotDePasse);
      setMotDePasseActuel("");
      setNouveauMotDePasse("");
      setConfirmerMotDePasse("");
      alertSuccess("Mot de passe mis à jour.");
    } catch (err) {
      // Le rejet backend le plus fréquent est un mot de passe actuel incorrect
      // — affiché sous ce champ plutôt qu'en toast générique.
      setErrors({ actuel: err instanceof Error ? err.message : "Erreur lors du changement de mot de passe." });
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6">
      <p className="mb-4 text-lg font-bold text-gray-900">Changement de mot de passe</p>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Mot de passe actuel</label>
          <div className="relative">
            <input
              type={showMotDePasseActuel ? "text" : "password"}
              value={motDePasseActuel}
              onChange={(e) => {
                setMotDePasseActuel(e.target.value);
                if (errors.actuel) setErrors((er) => ({ ...er, actuel: undefined }));
              }}
              className={`${inputGrayCls(!!errors.actuel)} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowMotDePasseActuel((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <EyeIcon />
            </button>
          </div>
          <FieldError msg={errors.actuel ?? ""} show={!!errors.actuel} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Nouveau mot de passe</label>
          <input
            type="password"
            value={nouveauMotDePasse}
            onChange={(e) => {
              setNouveauMotDePasse(e.target.value);
              if (errors.nouveau) setErrors((er) => ({ ...er, nouveau: undefined }));
            }}
            className={inputGrayCls(!!errors.nouveau)}
          />
          <FieldError msg={errors.nouveau ?? ""} show={!!errors.nouveau} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Confirmer le nouveau mot de passe</label>
          <input
            type="password"
            value={confirmerMotDePasse}
            onChange={(e) => {
              setConfirmerMotDePasse(e.target.value);
              if (errors.confirmer) setErrors((er) => ({ ...er, confirmer: undefined }));
            }}
            className={inputGrayCls(!!errors.confirmer)}
          />
          <FieldError msg={errors.confirmer ?? ""} show={!!errors.confirmer} />
        </div>
        <button
          onClick={handleChangePassword}
          disabled={isChangingPassword}
          className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {isChangingPassword ? "Modification…" : "Changer le mot de passe"}
        </button>
      </div>
    </div>
  );
}
