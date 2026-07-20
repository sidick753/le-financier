"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { usePmeData } from "./use-pme-data";
import { api } from "./api";

interface NegotiationOffer {
  id: string;
  proposedBy: "INVESTOR" | "PME";
  proposedReturn: string;
  conditions: string | null;
  note: string | null;
  status: string;
  createdAt: string;
}

export interface Offer {
  id: string;
  amountCommitted: string;
  status: string;
  lockedReturn: string | null;
  conditions: string | null;
  createdAt: string;
  fundingRequest: { title: string; currency: string };
  investor: { firstName: string; lastName: string; email: string };
  negotiationOffers: NegotiationOffer[];
}

export function useOffers() {
  const { token } = useAuth();
  const { organization } = usePmeData();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!token || !organization) {
      setIsLoading(false);
      return;
    }
    api
      .get<Offer[]>(`/investments/organization/${organization.id}`, token)
      .then(setOffers)
      .catch((err) => console.error("[useOffers] fetch failed", err))
      .finally(() => setIsLoading(false));
  }, [token, organization]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { offers, isLoading, refresh };
}
