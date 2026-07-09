"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

export interface InstitutionSidebarBadges {
  portefeuille: number;
  risques: number;
}

const EMPTY_BADGES: InstitutionSidebarBadges = { portefeuille: 0, risques: 0 };

export function useInstitutionSidebarBadges() {
  const { token } = useAuth();
  const [badges, setBadges] = useState<InstitutionSidebarBadges>(EMPTY_BADGES);

  const refresh = useCallback(() => {
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
    refresh();
  }, [refresh]);

  return badges;
}
