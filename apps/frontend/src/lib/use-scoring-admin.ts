"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

export interface ScoringDossier {
  id: string;
  pme: string;
  product: string;
  amount: string;
  submittedAt: string;
  completude: number;
  scoringStatus: string;
  grade: string | null;
  score: number | null;
  reportId: string | null;
  scoringError: string | null;
}

export interface ScoringHistoryReport {
  id: string;
  autoScore: number;
  grade: string | null;
  bareme_version: string;
  status: string;
  createdAt: string;
  organization: { legalName: string };
  fundingRequest: { title: string; category: string } | null;
  validatedBy: { firstName: string; lastName: string } | null;
}

export interface ScoringHistory {
  stats: {
    total: number;
    published: number;
    avgScore: number;
    baremeVersions: string[];
  };
  reports: ScoringHistoryReport[];
}

export interface ScoringWeightCriterion {
  key: string;
  label: string;
  weight: number;
}

export type ScoringWeights = Record<string, ScoringWeightCriterion[]>;

export function useScoringAdmin() {
  const { token } = useAuth();
  const [dossiers, setDossiers] = useState<ScoringDossier[]>([]);
  const [history, setHistory] = useState<ScoringHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [weights, setWeights] = useState<ScoringWeights | null>(null);
  const [weightsLoading, setWeightsLoading] = useState(true);
  const [weightsSaving, setWeightsSaving] = useState<string | null>(null);
  const [weightsError, setWeightsError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;
    setIsLoading(true);
    Promise.all([
      api.get<ScoringDossier[]>("/scoring/dashboard", token),
      api.get<ScoringHistory>("/scoring/history", token),
    ])
      .then(([d, h]) => {
        setDossiers(d);
        setHistory(h);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const refreshWeights = useCallback(() => {
    if (!token) return;
    setWeightsLoading(true);
    api
      .get<ScoringWeights>("/scoring/weights", token)
      .then(setWeights)
      .finally(() => setWeightsLoading(false));
  }, [token]);

  useEffect(() => {
    refreshWeights();
  }, [refreshWeights]);

  async function saveWeights(product: string, criteria: ScoringWeightCriterion[]) {
    if (!token) return;
    setWeightsSaving(product);
    setWeightsError(null);
    try {
      await api.put(
        `/scoring/weights/${product}`,
        { weights: criteria.map(({ key, weight }) => ({ key, weight })) },
        token,
      );
      refreshWeights();
    } catch (err) {
      setWeightsError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
      throw err;
    } finally {
      setWeightsSaving(null);
    }
  }

  async function launchScoring(fundingRequestId: string) {
    if (!token) return;
    setActionLoading(fundingRequestId);
    try {
      await api.post(`/scoring/compute/${fundingRequestId}`, {}, token);
    } finally {
      refresh();
      setActionLoading(null);
    }
  }

  async function validateReport(reportId: string, score?: number, notes?: string) {
    if (!token) return;
    setActionLoading(reportId);
    try {
      await api.patch(
        `/scoring/report/${reportId}/validate`,
        { validatedScore: score, notes },
        token,
      );
      refresh();
    } finally {
      setActionLoading(null);
    }
  }

  return {
    dossiers, history, isLoading, actionLoading, launchScoring, validateReport, refresh,
    weights, weightsLoading, weightsSaving, weightsError, saveWeights, refreshWeights,
  };
}
