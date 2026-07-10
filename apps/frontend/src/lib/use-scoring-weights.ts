"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

export interface ScoringWeightCriterion {
  key: string;
  label: string;
  weight: number;
}

export type ScoringWeights = Record<string, ScoringWeightCriterion[]>;

export function useScoringWeights() {
  const { token } = useAuth();
  const [weights, setWeights] = useState<ScoringWeights | null>(null);
  const [weightsLoading, setWeightsLoading] = useState(true);
  const [weightsSaving, setWeightsSaving] = useState<string | null>(null);
  const [weightsError, setWeightsError] = useState<string | null>(null);

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

  return { weights, weightsLoading, weightsSaving, weightsError, saveWeights, refreshWeights };
}
