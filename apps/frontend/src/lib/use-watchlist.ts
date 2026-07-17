"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";
import { ScoringReportSummary } from "./use-institution-data";

export interface WatchlistEntry {
  id: string;
  createdAt: string;
  fundingRequest: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    amountRequested: string;
    amountRaised: string;
    expectedReturn: string | null;
    durationMonths: number | null;
    currency: string;
    closesAt: string | null;
    investorMode: "SINGLE_INVESTOR" | "MULTIPLE_INVESTORS";
    organization: { legalName: string };
    scoringReports: ScoringReportSummary[];
  };
}

export function useWatchlist() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!token) return;
    setIsLoading(true);
    api
      .get<WatchlistEntry[]>("/watchlist", token)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const removeFavorite = useCallback(
    async (fundingRequestId: string) => {
      if (!token) return;
      setEntries((prev) => prev.filter((e) => e.fundingRequest.id !== fundingRequestId));
      await api.delete(`/watchlist/${fundingRequestId}`, token);
    },
    [token],
  );

  return { entries, isLoading, refresh, removeFavorite };
}
