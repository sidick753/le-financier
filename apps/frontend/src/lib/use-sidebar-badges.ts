"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

export interface SidebarBadges {
  pme: number;
  investisseurs: number;
  opportunites: number;
  partenaires: number;
  scoring: number;
}

const EMPTY_BADGES: SidebarBadges = {
  pme: 0,
  investisseurs: 0,
  opportunites: 0,
  partenaires: 0,
  scoring: 0,
};

export function useSidebarBadges() {
  const { token } = useAuth();
  const [badges, setBadges] = useState<SidebarBadges>(EMPTY_BADGES);

  const refresh = useCallback(() => {
    if (!token) return;
    Promise.all([
      api.get<{ pending: number }>("/organizations/admin/stats", token),
      api.get<{ pendingKyc: number }>("/auth/admin/users/investor-stats", token),
      api.get<{ underReview: number }>("/funding-requests/admin/stats", token),
      api.get<{ pending: number }>("/institutions/admin/stats", token),
      api.get<{ count: number }>("/scoring/pending-count", token),
    ])
      .then(([pme, investisseurs, opportunites, partenaires, scoring]) => {
        setBadges({
          pme: pme.pending,
          investisseurs: investisseurs.pendingKyc,
          opportunites: opportunites.underReview,
          partenaires: partenaires.pending,
          scoring: scoring.count,
        });
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return badges;
}
