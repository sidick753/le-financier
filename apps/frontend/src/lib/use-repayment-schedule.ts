"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

export interface RepaymentPayment {
  id: string;
  amountPaid: string;
  paidAt: string;
  status: "PENDING_VALIDATION" | "CONFIRMED" | "REJECTED" | "DISPUTED";
}

export interface RepaymentScheduleEntry {
  id: string;
  dueDate: string;
  amountDue: string;
  interestAmount: string;
  principalAmount: string;
  nature: "INTEREST" | "INSTALLMENT" | "FINAL_PAYMENT";
  status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
  payments: RepaymentPayment[];
}

// Chargement paresseux : n'appelle l'API que lorsque `enabled` passe à true
// (évite de charger l'échéancier de chaque investissement tant que sa card
// n'est pas dépliée).
export function useRepaymentSchedule(investmentId: string, enabled: boolean) {
  const { token } = useAuth();
  const [schedule, setSchedule] = useState<RepaymentScheduleEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = useCallback(() => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    api
      .get<RepaymentScheduleEntry[]>(`/repayments/investment/${investmentId}`, token)
      .then(setSchedule)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement."))
      .finally(() => setIsLoading(false));
  }, [token, investmentId]);

  useEffect(() => {
    if (enabled && schedule === null && !isLoading) fetchSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, schedule, fetchSchedule]);

  return { schedule, isLoading, error, refetch: fetchSchedule };
}
