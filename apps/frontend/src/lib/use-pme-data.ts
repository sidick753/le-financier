"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

export interface Organization {
  id: string;
  legalName: string;
  verificationStatus: string;
}

export interface FundingRequest {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  category: string;
  amountRequested: string;
  amountRaised: string;
  currency: string;
  expectedReturn: string | null;
  durationMonths: number | null;
  status: string;
  publishedAt: string | null;
  closesAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { investments: number };
}

export interface ScoringReport {
  autoScore: string | number;
  grade: string | null;
}

export function usePmeData() {
  const { token } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [fundingRequests, setFundingRequests] = useState<FundingRequest[]>([]);
  const [scoringReport, setScoringReport] = useState<ScoringReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;

    async function load() {
      try {
        const organizations = await api.get<Organization[]>("/organizations/mine", token!);
        const primaryOrg = organizations[0] ?? null;
        setOrganization(primaryOrg);

        if (primaryOrg) {
          const requests = await api.get<FundingRequest[]>(
            `/funding-requests/organization/${primaryOrg.id}`,
            token!,
          );
          setFundingRequests(requests);

          if (requests.length > 0) {
            try {
              const report = await api.get<ScoringReport>(
                `/funding-requests/${requests[0].id}/scoring`,
                token!,
              );
              setScoringReport(report);
            } catch {
              setScoringReport(null); // pas encore scoré
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { organization, fundingRequests, scoringReport, isLoading, error, refresh };
}
