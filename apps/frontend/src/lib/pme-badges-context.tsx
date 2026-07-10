"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

interface PmeBadgesContextValue {
  offresPending: number;
  refreshBadges: () => void;
}

const PmeBadgesContext = createContext<PmeBadgesContextValue | null>(null);

export function PmeBadgesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [offresPending, setOffresPending] = useState(0);

  const refreshBadges = useCallback(() => {
    if (!token) return;
    api
      .get<{ id: string }[]>("/organizations/mine", token)
      .then((orgs) => {
        const org = orgs[0];
        if (!org) return null;
        return api.get<{ count: number }>(`/investments/organization/${org.id}/pending-count`, token);
      })
      .then((res) => {
        if (res) setOffresPending(res.count);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    refreshBadges();
  }, [refreshBadges]);

  return (
    <PmeBadgesContext.Provider value={{ offresPending, refreshBadges }}>
      {children}
    </PmeBadgesContext.Provider>
  );
}

export function usePmeBadges() {
  const ctx = useContext(PmeBadgesContext);
  if (!ctx) throw new Error("usePmeBadges doit être utilisé dans un PmeBadgesProvider.");
  return ctx;
}
