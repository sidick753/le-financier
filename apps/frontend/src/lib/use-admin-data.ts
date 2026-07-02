"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

export interface AdminOrganization {
  id: string;
  legalName: string;
  sector: string;
  city: string;
  verificationStatus: string;
  createdAt: string;
  members: Array<{
    user: { firstName: string; lastName: string };
  }>;
  fundingRequests: Array<{
    id: string;
    amountRaised: string;
    status: string;
  }>;
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  kycStatus: string;
  createdAt: string;
  investments: Array<{ amountCommitted: string; status: string }>;
}

export function useAdminData() {
  const { token } = useAuth();
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [fundingRequests, setFundingRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!token) return;
    setIsLoading(true);
    Promise.all([
      api.get<AdminOrganization[]>("/organizations/admin/all", token),
      api.get<AdminUser[]>("/auth/admin/users", token),
      api.get<any[]>("/funding-requests/admin/all", token),
    ])
      .then(([orgs, usrs, funding]) => {
        setOrganizations(orgs);
        setUsers(usrs);
        setFundingRequests(funding);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { organizations, users, fundingRequests, isLoading, refresh };
}
