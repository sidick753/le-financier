"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

// Profil personnel de l'utilisateur connecté — commun aux 4 rôles (PME_OWNER,
// INVESTOR, INSTITUTION, ADMIN). Distinct du profil de l'entité (Organization /
// Institution) que possèdent PME et Institution.
export interface AccountProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  cniNumber: string | null;
  role: string;
  kycStatus: string;
  kycRejectionReason: string | null;
  isActive: boolean;
  createdAt: string;
}

export function useAccountProfile() {
  const { token, updateUser } = useAuth();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!token) return;
    setIsLoading(true);
    api
      .get<AccountProfile>("/auth/me", token)
      .then(setProfile)
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function updateProfile(data: { firstName?: string; lastName?: string; phone?: string; cniNumber?: string }) {
    if (!token) return;
    const updated = await api.patch<AccountProfile>("/auth/me", data, token);
    setProfile(updated);
    updateUser({ firstName: updated.firstName, lastName: updated.lastName });
    return updated;
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!token) return;
    return api.patch<{ message: string }>(
      "/auth/change-password",
      { currentPassword, newPassword },
      token,
    );
  }

  return { profile, isLoading, refresh, updateProfile, changePassword };
}
