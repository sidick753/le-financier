"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "./api";

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: string;
  amountRequested: string;
  amountRaised: string;
  expectedReturn: string | null;
  durationMonths: number | null;
  currency: string;
  closesAt: string | null;
  organization: { legalName: string };
}

interface Filters {
  category?: string;
  search?: string;
}

export function useOpportunities(filters: Filters) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.search)   params.set("search",   filters.search);

    api
      .get<Opportunity[]>(`/funding-requests/published?${params.toString()}`)
      .then(setOpportunities)
      .catch(() => setOpportunities([]))
      .finally(() => setIsLoading(false));
  }, [filters.category, filters.search]);

  useEffect(() => {
    const timeout = setTimeout(fetchData, 300);
    return () => clearTimeout(timeout);
  }, [fetchData]);

  return { opportunities, isLoading };
}
