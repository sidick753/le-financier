"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

export interface InstitutionSidebarBadges {
  portefeuille: number;
  risques: number;
}

const EMPTY_BADGES: InstitutionSidebarBadges = { portefeuille: 0, risques: 0 };

interface InstitutionBadgesContextValue {
  badges: InstitutionSidebarBadges;
  refreshBadges: () => void;
}

const InstitutionBadgesContext = createContext<InstitutionBadgesContextValue | null>(null);

export function InstitutionBadgesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [badges, setBadges] = useState<InstitutionSidebarBadges>(EMPTY_BADGES);

  const refreshBadges = useCallback(() => {
    if (!token) return;
    Promise.all([
      api.get<{ count: number }>("/investments/mine/pending-count", token),
      api.get<{ stats: { alertesActives: number } }>("/institutions/mine/aml-alerts", token),
    ])
      .then(([negotiations, aml]) => {
        setBadges({ portefeuille: negotiations.count, risques: aml.stats.alertesActives });
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    refreshBadges();
  }, [refreshBadges]);

  return (
    <InstitutionBadgesContext.Provider value={{ badges, refreshBadges }}>
      {children}
    </InstitutionBadgesContext.Provider>
  );
}

export function useInstitutionBadges() {
  const ctx = useContext(InstitutionBadgesContext);
  if (!ctx) throw new Error("useInstitutionBadges doit être utilisé dans un InstitutionBadgesProvider.");
  return ctx;
}
