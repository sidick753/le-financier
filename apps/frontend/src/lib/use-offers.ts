"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { usePmeData } from "./use-pme-data";
import { api } from "./api";

interface Offer {
  id: string;
  amountCommitted: string;
  status: string;
  createdAt: string;
  fundingRequest: { title: string; currency: string };
  investor: { firstName: string; lastName: string };
}

export function useOffers() {
  const { token } = useAuth();
  const { organization } = usePmeData();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token || !organization) return;

    api
      .get<Offer[]>(`/investments/organization/${organization.id}`, token)
      .then(setOffers)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [token, organization]);

  return { offers, isLoading };
}
