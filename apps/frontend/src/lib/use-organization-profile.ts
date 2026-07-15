"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { usePmeData } from "./use-pme-data";
import { api } from "./api";

interface OrganizationProfile {
  secteurCode: string | null;
  cashFlowAnnuel: string | null;
  fluxMobileMoneyMensuel: string | null;
  dirigeantExperienceAns: number | null;
}

// Le profil de crédit (onglet "Profil entreprise" des Paramètres) compte une
// vingtaine de champs optionnels répartis sur plusieurs sections — exiger un
// remplissage à 100% déclencherait l'alerte en permanence, y compris pour des
// champs spécifiques à un produit que la PME ne vise pas. On considère le
// profil "démarré" dès que ces trois champs socles (un par section) sont
// renseignés, ce qui suffit à distinguer un compte fraîchement créé d'un
// profil réellement complété.
export function useOrganizationProfileStatus() {
  const { token } = useAuth();
  const { organization } = usePmeData();
  const [isComplete, setIsComplete] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!token || !organization) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    api
      .get<OrganizationProfile>(`/organizations/${organization.id}`, token)
      .then((p) => {
        const hasFinancials = p.cashFlowAnnuel != null || p.fluxMobileMoneyMensuel != null;
        setIsComplete(!!p.secteurCode && hasFinancials && p.dirigeantExperienceAns != null);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [token, organization]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { isComplete, isLoading, refresh };
}
