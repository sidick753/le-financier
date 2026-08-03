"use client";

import { useState } from "react";
import { useAccountProfile } from "@/lib/use-account-profile";
import { EyeIcon } from "./eye-icon";
import { INPUT_GRAY } from "./form-styles";
import { alertError, alertSuccess } from "@/lib/alert";

// Bloc "Changement de mot de passe" — identique pour les 4 rôles (PME_OWNER,
// INVESTOR, INSTITUTION, ADMIN), tous authentifiés via /auth/change-password.
export function PasswordSecuritySection() {
  const { changePassword } = useAccountProfile();

  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmerMotDePasse, setConfirmerMotDePasse] = useState("");
  const [showMotDePasseActuel, setShowMotDePasseActuel] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  async function handleChangePassword() {
    if (nouveauMotDePasse !== confirmerMotDePasse) {
      alertError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword(motDePasseActuel, nouveauMotDePasse);
      setMotDePasseActuel("");
      setNouveauMotDePasse("");
      setConfirmerMotDePasse("");
      alertSuccess("Mot de passe mis à jour.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Erreur lors du changement de mot de passe.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6">
      <p className="mb-4 text-sm font-semibold text-gray-900">Changement de mot de passe</p>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Mot de passe actuel</label>
          <div className="relative">
            <input
              type={showMotDePasseActuel ? "text" : "password"}
              value={motDePasseActuel}
              onChange={(e) => setMotDePasseActuel(e.target.value)}
              className={`${INPUT_GRAY} pr-10`}
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
            className={INPUT_GRAY}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Confirmer le nouveau mot de passe</label>
          <input
            type="password"
            value={confirmerMotDePasse}
            onChange={(e) => setConfirmerMotDePasse(e.target.value)}
            className={INPUT_GRAY}
          />
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
