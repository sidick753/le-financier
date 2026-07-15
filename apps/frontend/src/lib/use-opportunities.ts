"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "./api";
import { ScoringReportSummary } from "./use-institution-data";

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
  investorMode: "SINGLE_INVESTOR" | "MULTIPLE_INVESTORS";
  hasActiveInvestor: boolean;
  organization: { legalName: string };
  scoringReports: ScoringReportSummary[];
}

interface Filters {
  category?: string;
  search?: string;
  sort?: string;
  risk?: string;
  page?: number;
  limit?: number;
}

export function useOpportunities(filters: Filters) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  // Incrémenté à chaque fetch : permet d'ignorer une réponse arrivée en retard
  // (ex. requête précédente plus lente qui répondrait après la suivante et
  // écraserait un résultat filtré plus récent).
  const requestIdRef = useRef(0);

  const fetchData = useCallback(() => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.search)   params.set("search",   filters.search);
    if (filters.sort)     params.set("sort",     filters.sort);
    if (filters.risk)     params.set("risk",     filters.risk);
    if (filters.page)     params.set("page",     String(filters.page));
    if (filters.limit)    params.set("limit",    String(filters.limit));

    api
      .get<{ data: Opportunity[]; total: number }>(`/funding-requests/published?${params.toString()}`)
      .then((res) => {
        if (requestId !== requestIdRef.current) return;
        setOpportunities(res.data);
        setTotal(res.total);
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setOpportunities([]);
        setTotal(0);
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;
        setIsLoading(false);
      });
  }, [filters.category, filters.search, filters.sort, filters.page, filters.limit]);

  useEffect(() => {
    const timeout = setTimeout(fetchData, 300);
    return () => clearTimeout(timeout);
  }, [fetchData]);

  return { opportunities, total, isLoading };
}
