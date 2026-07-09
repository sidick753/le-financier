"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

export function usePmeOffersBadge() {
  const { token } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!token) return;
    api
      .get<{ id: string }[]>("/organizations/mine", token)
      .then((orgs) => {
        const org = orgs[0];
        if (!org) return null;
        return api.get<{ count: number }>(`/investments/organization/${org.id}/pending-count`, token);
      })
      .then((res) => {
        if (res) setCount(res.count);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return count;
}
