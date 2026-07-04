"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

export interface InstitutionProfile {
  id: string;
  name: string;
  type: string | null;
  bceaoApprovalNumber: string | null;
  country: string;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  envelopeMax: string | null;
  ticketMin: string | null;
  ticketMax: string | null;
  excludedSectors: string[];
  apiKeyLastFour: string | null;
  apiKeyGeneratedAt: string | null;
}

export interface InstitutionMember {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "OWNER" | "ANALYST" | "COMPLIANCE";
  status: "ACTIVE" | "TRAINING";
  specialty: string | null;
  dossiersActifs: number;
  encoursGere: number;
}

export interface RiskIndicator {
  value: number | null;
  disponible: boolean;
}

export interface RiskIndicators {
  npl: RiskIndicator;
  concentrationSectorielle: RiskIndicator;
  couvertureGaranties: RiskIndicator;
  lcr: RiskIndicator;
  car: RiskIndicator;
  ratioLevier: RiskIndicator;
}

export function useInstitutionSettings() {
  const { token } = useAuth();
  const [institution, setInstitution] = useState<InstitutionProfile | null>(null);
  const [members, setMembers] = useState<InstitutionMember[]>([]);
  const [riskIndicators, setRiskIndicators] = useState<RiskIndicators | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!token) return;
    setIsLoading(true);
    Promise.all([
      api.get<InstitutionProfile>("/institutions/mine", token),
      api.get<InstitutionMember[]>("/institutions/mine/members", token),
      api.get<RiskIndicators>("/institutions/mine/risk-indicators", token),
    ])
      .then(([inst, mem, risk]) => {
        setInstitution(inst);
        setMembers(mem);
        setRiskIndicators(risk);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function updateProfile(data: Partial<Pick<InstitutionProfile, "name" | "type" | "bceaoApprovalNumber" | "country" | "address" | "contactEmail" | "contactPhone">>) {
    if (!token) return;
    const updated = await api.patch<InstitutionProfile>("/institutions/mine", data, token);
    setInstitution(updated);
  }

  async function updateLimits(data: { envelopeMax?: number; ticketMin?: number; ticketMax?: number; excludedSectors?: string[] }) {
    if (!token) return;
    const updated = await api.patch<InstitutionProfile>("/institutions/mine/limits", data, token);
    setInstitution(updated);
  }

  async function regenerateApiKey() {
    if (!token) return null;
    const result = await api.post<{ apiKey: string; apiKeyLastFour: string }>(
      "/institutions/mine/api-key/regenerate",
      {},
      token,
    );
    refresh();
    return result.apiKey;
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!token) return;
    return api.patch<{ message: string }>("/auth/change-password", { currentPassword, newPassword }, token);
  }

  async function inviteMember(data: { email: string; firstName: string; lastName: string; role: string; specialty?: string }) {
    if (!token) return null;
    const result = await api.post<{ message: string; temporaryPassword: string }>(
      "/institutions/mine/members/invite",
      data,
      token,
    );
    refresh();
    return result;
  }

  async function removeMember(memberId: string) {
    if (!token) return;
    await api.delete(`/institutions/mine/members/${memberId}`, token);
    refresh();
  }

  return {
    institution,
    members,
    riskIndicators,
    isLoading,
    refresh,
    updateProfile,
    updateLimits,
    regenerateApiKey,
    changePassword,
    inviteMember,
    removeMember,
  };
}
