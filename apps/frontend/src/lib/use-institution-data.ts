"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

export interface ScoringReportSummary {
  grade: string | null;
  autoScore: string;
}

export interface InstitutionInvestment {
  id: string;
  amountCommitted: string;
  status: string;
  lockedReturn: string | null;
  createdAt: string;
  fundingRequest: {
    id: string;
    title: string;
    category: string;
    amountRequested: string;
    amountRaised: string;
    currency: string;
    durationMonths: number | null;
    organization: {
      legalName: string;
      sector: string;
    };
    scoringReports: ScoringReportSummary[];
  };
  negotiationOffers: Array<{
    proposedBy: string;
    proposedReturn: string;
    status: string;
    createdAt: string;
  }>;
}

export interface InstitutionOpportunity {
  id: string;
  title: string;
  description: string;
  category: string;
  amountRequested: string;
  amountRaised: string;
  expectedReturn: string | null;
  durationMonths: number | null;
  currency: string;
  createdAt: string;
  investorMode: "SINGLE_INVESTOR" | "MULTIPLE_INVESTORS";
  hasActiveInvestor: boolean;
  organization: {
    legalName: string;
    sector: string;
    city: string;
  };
  scoringReports: ScoringReportSummary[];
}

export const NEW_DEAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function isRecentlyCreated(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < NEW_DEAL_WINDOW_MS;
}

export function gradeToRisk(grade: string | null): "Faible" | "Modéré" | "Élevé" | null {
  if (!grade) return null;
  if (grade === "A+" || grade === "A") return "Faible";
  if (grade === "BBB") return "Modéré";
  return "Élevé";
}

export const GRADE_CLASSNAMES: Record<string, string> = {
  "A+": "bg-green-100 text-green-700",
  A: "bg-green-100 text-green-700",
  BBB: "bg-yellow-100 text-yellow-700",
  BB: "bg-orange-100 text-orange-700",
  B: "bg-red-100 text-red-700",
};

export const RISK_CLASSNAMES: Record<string, string> = {
  Faible: "bg-green-100 text-green-700",
  Modéré: "bg-yellow-100 text-yellow-700",
  Élevé: "bg-red-100 text-red-700",
};

export function useInstitutionData() {
  const { token } = useAuth();
  const [investments, setInvestments] = useState<InstitutionInvestment[]>([]);
  const [opportunities, setOpportunities] = useState<InstitutionOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!token) return;
    setIsLoading(true);
    Promise.all([
      api.get<InstitutionInvestment[]>("/investments/mine", token),
      api.get<InstitutionOpportunity[]>("/funding-requests/published", token),
    ])
      .then(([inv, opp]) => {
        setInvestments(inv);
        setOpportunities(opp);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalDeployed = investments
    .filter((i) => ["COMMITTED", "SETTLED_OFF_PLATFORM"].includes(i.status))
    .reduce((s, i) => s + Number(i.amountCommitted), 0);

  const activeInvestments = investments.filter((i) =>
    ["COMMITTED", "NEGOTIATING", "SETTLED_OFF_PLATFORM"].includes(i.status),
  );

  const avgReturn =
    activeInvestments.length > 0
      ? activeInvestments
          .filter((i) => i.lockedReturn)
          .reduce((s, i) => s + Number(i.lockedReturn), 0) /
        Math.max(1, activeInvestments.filter((i) => i.lockedReturn).length)
      : 0;

  const byCategory = activeInvestments.reduce<Record<string, number>>((acc, inv) => {
    const cat = inv.fundingRequest.category;
    acc[cat] = (acc[cat] ?? 0) + Number(inv.amountCommitted);
    return acc;
  }, {});

  return {
    investments,
    opportunities,
    isLoading,
    refresh,
    totalDeployed,
    activeInvestments,
    avgReturn,
    byCategory,
  };
}
