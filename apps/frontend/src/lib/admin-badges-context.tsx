"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

export interface SidebarBadges {
  pme: number;
  investisseurs: number;
  opportunites: number;
  partenaires: number;
  scoring: number;
  remboursements: number;
}

const EMPTY_BADGES: SidebarBadges = {
  pme: 0,
  investisseurs: 0,
  opportunites: 0,
  partenaires: 0,
  scoring: 0,
  remboursements: 0,
};

interface AdminBadgesContextValue {
  badges: SidebarBadges;
  refreshBadges: () => void;
}

const AdminBadgesContext = createContext<AdminBadgesContextValue | null>(null);

export function AdminBadgesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [badges, setBadges] = useState<SidebarBadges>(EMPTY_BADGES);

  const refreshBadges = useCallback(() => {
    if (!token) return;
    Promise.all([
      api.get<{ pending: number }>("/organizations/admin/stats", token),
      api.get<{ pendingKyc: number }>("/auth/admin/users/investor-stats", token),
      api.get<{ underReview: number }>("/funding-requests/admin/stats", token),
      api.get<{ pending: number }>("/institutions/admin/stats", token),
      api.get<{ count: number }>("/scoring/pending-count", token),
      api.get<unknown[]>("/repayments/admin/pending", token),
      // Réclamations en attente (PayoutClaim) — introduites par le flux de décaissement
      // partiel, rattachées respectivement aux sections Opportunités et Remboursements.
      api.get<unknown[]>("/funding-requests/admin/claims/pending", token),
      api.get<unknown[]>("/repayments/admin/claims/pending", token),
    ])
      .then(([pme, investisseurs, opportunites, partenaires, scoring, pendingPayments, pendingFundingClaims, pendingRepaymentClaims]) => {
        setBadges({
          pme: pme.pending,
          investisseurs: investisseurs.pendingKyc,
          opportunites: opportunites.underReview + pendingFundingClaims.length,
          partenaires: partenaires.pending,
          scoring: scoring.count,
          remboursements: pendingPayments.length + pendingRepaymentClaims.length,
        });
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    refreshBadges();
  }, [refreshBadges]);

  return (
    <AdminBadgesContext.Provider value={{ badges, refreshBadges }}>
      {children}
    </AdminBadgesContext.Provider>
  );
}

export function useAdminBadges() {
  const ctx = useContext(AdminBadgesContext);
  if (!ctx) throw new Error("useAdminBadges doit être utilisé dans un AdminBadgesProvider.");
  return ctx;
}
