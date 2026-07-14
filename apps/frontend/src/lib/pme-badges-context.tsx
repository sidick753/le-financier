"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

interface PmeBadgesContextValue {
  offresPending: number;
  demandesCount: number;
  refreshBadges: () => void;
}

const PmeBadgesContext = createContext<PmeBadgesContextValue | null>(null);

export function PmeBadgesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [offresPending, setOffresPending] = useState(0);
  const [demandesCount, setDemandesCount] = useState(0);

  const refreshBadges = useCallback(async () => {
    if (!token) return;
    let org: { id: string } | undefined;
    try {
      const orgs = await api.get<{ id: string }[]>("/organizations/mine", token);
      org = orgs[0];
    } catch {
      // ignore — les badges resteront à leur dernière valeur connue
    }
    if (!org) return;

    // Promise.allSettled plutôt que Promise.all : l'échec transitoire d'un des
    // deux appels ne doit pas empêcher l'autre badge (indépendant) de se mettre
    // à jour.
    const [pendingResult, demandesResult] = await Promise.allSettled([
      api.get<{ count: number }>(`/investments/organization/${org.id}/pending-count`, token),
      api.get<{ id: string; status: string }[]>(`/funding-requests/organization/${org.id}`, token),
    ]);
    if (pendingResult.status === "fulfilled") {
      setOffresPending(pendingResult.value.count);
    }
    if (demandesResult.status === "fulfilled") {
      setDemandesCount(demandesResult.value.filter((d) => d.status !== "CLOSED").length);
    }
  }, [token]);

  useEffect(() => {
    refreshBadges();
  }, [refreshBadges]);

  return (
    <PmeBadgesContext.Provider value={{ offresPending, demandesCount, refreshBadges }}>
      {children}
    </PmeBadgesContext.Provider>
  );
}

export function usePmeBadges() {
  const ctx = useContext(PmeBadgesContext);
  if (!ctx) throw new Error("usePmeBadges doit être utilisé dans un PmeBadgesProvider.");
  return ctx;
}
