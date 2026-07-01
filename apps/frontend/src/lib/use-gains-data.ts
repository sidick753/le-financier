"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

interface UpcomingSchedule {
  id: string;
  dueDate: string;
  amountDue: string;
  interestAmount: string;
  principalAmount: string;
  nature: string;
  status: string;
  fundingRequest: {
    title: string;
    category: string;
    organization: { legalName: string };
  };
}

interface Payment {
  id: string;
  amountPaid: string;
  paidAt: string;
  repaymentSchedule: {
    nature: string;
    interestAmount: string;
    fundingRequest: {
      title: string;
      category: string;
      organization: { legalName: string };
    };
    investment: { lockedReturn: string | null };
  };
}

export function useGainsData() {
  const { token } = useAuth();
  const [upcoming, setUpcoming] = useState<UpcomingSchedule[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!token) return;
    setIsLoading(true);
    Promise.all([
      api.get<UpcomingSchedule[]>("/repayments/my-schedule", token),
      api.get<Payment[]>("/repayments/my-payments", token),
    ])
      .then(([upcomingData, paymentsData]) => {
        setUpcoming(upcomingData);
        setPayments(paymentsData);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalRevenues = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
  const totalInterests = payments.reduce(
    (sum, p) => sum + Number(p.repaymentSchedule.interestAmount),
    0,
  );

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const revenuesThisMonth = payments
    .filter((p) => {
      const d = new Date(p.paidAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, p) => sum + Number(p.amountPaid), 0);

  const nextDue = upcoming[0] ?? null;

  const paymentsWithRate = payments.filter((p) => p.repaymentSchedule.investment.lockedReturn);
  const avgRate =
    paymentsWithRate.length > 0
      ? paymentsWithRate.reduce(
          (sum, p) => sum + Number(p.repaymentSchedule.investment.lockedReturn),
          0,
        ) / paymentsWithRate.length
      : 0;

  const monthlyRevenues = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.getMonth();
    const year = d.getFullYear();
    const total = payments
      .filter((p) => {
        const pd = new Date(p.paidAt);
        return pd.getMonth() === month && pd.getFullYear() === year;
      })
      .reduce((sum, p) => sum + Number(p.amountPaid), 0);
    return {
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
      total,
    };
  });

  return {
    upcoming,
    payments,
    isLoading,
    refresh,
    totalRevenues,
    totalInterests,
    revenuesThisMonth,
    nextDue,
    avgRate,
    monthlyRevenues,
  };
}
