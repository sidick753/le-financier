"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

interface NegotiationOffer {
  id: string;
  proposedBy: "INVESTOR" | "PME";
  proposedReturn: string;
  status: string;
  createdAt: string;
}

export interface MyInvestment {
  id: string;
  amountCommitted: string;
  lockedReturn: string | null;
  status: string;
  createdAt: string;
  negotiationOffers: NegotiationOffer[];
  fundingRequest: {
    id: string;
    title: string;
    category: string;
    currency: string;
    amountRequested: string;
    amountRaised: string;
    expectedReturn: string | null;
    durationMonths: number | null;
    organization: { legalName: string };
  };
}

export interface Opportunity {
  id: string;
  title: string;
  category: string;
  amountRequested: string;
  amountRaised: string;
  expectedReturn: string | null;
  currency: string;
  organization: { legalName: string };
}

export function useInvestorData() {
  const { token } = useAuth();
  const [investments, setInvestments] = useState<MyInvestment[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;
    setIsLoading(true);
    Promise.all([
      api.get<MyInvestment[]>("/investments/mine", token),
      api.get<Opportunity[]>("/funding-requests/published", token),
    ])
      .then(([myInvestments, published]) => {
        setInvestments(myInvestments);
        const engagedIds = new Set(myInvestments.map((i) => i.fundingRequest.id));
        setOpportunities(published.filter((o) => !engagedIds.has(o.id)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement."))
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { investments, opportunities, isLoading, error, refresh };
}
