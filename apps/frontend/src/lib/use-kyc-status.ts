"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { usePmeData } from "./use-pme-data";
import { api } from "./api";

export interface KycItem {
  key: string;
  label: string;
  documentType: string;
  status: "VALIDATED" | "PENDING_REVIEW" | "MISSING";
  documentId: string | null;
}

export function useKycStatus() {
  const { token } = useAuth();
  const { organization } = usePmeData();
  const [items, setItems] = useState<KycItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!token || !organization) return;
    setIsLoading(true);
    api
      .get<KycItem[]>(`/documents/organization/${organization.id}/kyc-status`, token)
      .then(setItems)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [token, organization]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, isLoading, refresh };
}
