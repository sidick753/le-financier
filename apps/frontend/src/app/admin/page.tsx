"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminData } from "@/lib/use-admin-data";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

function formatAmount(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}Md`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString("fr-FR");
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminDashboardPage() {
  const { organizations, users, fundingRequests, isLoading } = useAdminData();
  const { token } = useAuth();
  const [institutionsTotal, setInstitutionsTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .get<{ total: number }>("/institutions/admin/stats", token)
      .then((stats) => setInstitutionsTotal(stats.total))
      .catch(() => {});
  }, [token]);

  const pendingOrgs = organizations.filter(
    (o) => o.verificationStatus === "PENDING",
  );
  const verifiedOrgs = organizations.filter(
    (o) => o.verificationStatus === "VERIFIED",
  );
  const investors = users.filter((u) =>
    ["INVESTOR", "INSTITUTION"].includes(u.role),
  );
  const pendingKyc = users.filter((u) => u.kycStatus === "PENDING");
  const pendingFunding = fundingRequests.filter(
    (f) => f.status === "UNDER_REVIEW",
  );

  const totalVolume = organizations.reduce((sum, org) => {
    return (
      sum +
      org.fundingRequests.reduce(
        (s, fr) => s + Number(fr.amountRaised ?? 0),
        0,
      )
    );
  }, 0);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard Admin</h1>
        <p className="text-sm text-gray-500">
          Vue d&apos;ensemble de la plateforme LeFinancier
        </p>
      </div>

      {/* 5 stats */}
      <div className="mb-6 grid grid-cols-5 gap-4">
        <StatCard
          label="PME actives"
          value={isLoading ? "…" : verifiedOrgs.length.toString()}
          hint={`${pendingOrgs.length} en attente`}
          icon="🏢"
          badge={pendingOrgs.length}
        />
        <StatCard
          label="Investisseurs"
          value={isLoading ? "…" : investors.length.toString()}
          hint={`${pendingKyc.filter((u) => ["INVESTOR", "INSTITUTION"].includes(u.role)).length} en attente`}
          icon="👥"
          badge={
            pendingKyc.filter((u) =>
              ["INVESTOR", "INSTITUTION"].includes(u.role),
            ).length
          }
        />
        <StatCard
          label="Volume total"
          value={isLoading ? "…" : formatAmount(totalVolume)}
          hint="F CFA levés"
          icon="📈"
        />
        <StatCard
          label="Opportunités en attente"
          value={isLoading ? "…" : pendingFunding.length.toString()}
          hint="À approuver"
          icon="⏱"
          badge={pendingFunding.length}
        />
        <StatCard
          label="Institutions"
          value={institutionsTotal === null ? "…" : institutionsTotal.toString()}
          hint="partenaires actifs"
          icon="🏛️"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Vérifications en attente */}
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 p-5">
            <p className="text-sm font-semibold text-gray-900">
              Vérifications en attente
            </p>
            {pendingOrgs.length > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {pendingOrgs.length} en attente
              </span>
            )}
          </div>
          <div className="flex-1 divide-y divide-gray-100">
            {isLoading && (
              <p className="p-5 text-sm text-gray-400">Chargement...</p>
            )}
            {!isLoading && pendingOrgs.length === 0 && (
              <p className="p-5 text-sm text-gray-400">
                Aucune vérification en attente.
              </p>
            )}
            {pendingOrgs.slice(0, 5).map((org) => (
              <Link
                key={org.id}
                href={`/admin/pme/${org.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {org.legalName}
                  </p>
                  <p className="text-xs text-gray-500">
                    PME · {formatDate(org.createdAt)}
                  </p>
                </div>
                <span className="text-xs font-medium text-brand-700">
                  Voir le dossier →
                </span>
              </Link>
            ))}
          </div>
          {!isLoading && pendingOrgs.length > 0 && (
            <div className="border-t border-gray-100 p-3 text-center">
              <Link
                href="/admin/pme?status=PENDING"
                className="text-xs text-brand-700 hover:underline"
              >
                Voir plus →
              </Link>
            </div>
          )}
        </div>

        {/* Opportunités à modérer */}
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 p-5">
            <p className="text-sm font-semibold text-gray-900">
              Opportunités à modérer
            </p>
            {pendingFunding.length > 0 && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                {pendingFunding.length} à traiter
              </span>
            )}
          </div>
          <div className="flex-1 divide-y divide-gray-100">
            {isLoading && (
              <p className="p-5 text-sm text-gray-400">Chargement...</p>
            )}
            {!isLoading && pendingFunding.length === 0 && (
              <p className="p-5 text-sm text-gray-400">
                Aucune opportunité en attente.
              </p>
            )}
            {pendingFunding.slice(0, 4).map((fr) => (
              <Link
                key={fr.id}
                href={`/admin/opportunites/${fr.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {fr.organization?.legalName ?? "—"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {fr.title} ·{" "}
                    {Number(fr.amountRequested).toLocaleString("fr-FR")} F CFA
                  </p>
                </div>
                <span className="text-xs font-medium text-brand-700">
                  Voir le dossier →
                </span>
              </Link>
            ))}
          </div>
          {!isLoading && pendingFunding.length > 0 && (
            <div className="border-t border-gray-100 p-3 text-center">
              <Link
                href="/admin/opportunites?status=UNDER_REVIEW"
                className="text-xs text-brand-700 hover:underline"
              >
                Voir plus →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Activité de la plateforme */}
      <div className="mt-4 grid grid-cols-4 gap-4">
        <ActivityCard
          value={fundingRequests
            .filter((f) => f.status === "PUBLISHED")
            .length.toString()}
          label="En cours de financement"
          icon="⏱"
          color="text-orange-600"
        />
        <ActivityCard
          value={fundingRequests
            .filter((f) => f.status === "FUNDED")
            .length.toString()}
          label="Financements réussis"
          icon="✓"
          color="text-green-600"
        />
        <ActivityCard
          value="—"
          label="Taux de remboursement"
          icon="📈"
          color="text-brand-700"
        />
        <ActivityCard
          value="0"
          label="Litiges en cours"
          icon="⚠"
          color="text-red-500"
        />
      </div>

      {/* Reporting BCEAO */}
      {/* <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">
            Reporting Réglementaire BCEAO
          </p>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            Q2 2026
          </span>
        </div>
        <div className="space-y-4">
          {[
            {
              label: "Rapport prudentiel T2 2026",
              deadline: "À soumettre avant le 30/09/2026",
              progress: 85,
              color: "bg-blue-600",
              status: "Compléter",
            },
            {
              label: "Déclaration LAB-CFT S1 2026",
              deadline: "À soumettre avant le 15/07/2026",
              progress: 40,
              color: "bg-orange-500",
              status: "Continuer",
            },
            {
              label: "Statistiques marché PME",
              deadline: "Soumis le 1/07/2026",
              progress: 100,
              color: "bg-green-500",
              status: "Voir",
            },
          ].map((report) => (
            <div key={report.label}>
              <div className="mb-1 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {report.label}
                  </p>
                  <p className="text-xs text-gray-400">{report.deadline}</p>
                </div>
                <button
                  className={`rounded-md px-3 py-1 text-xs font-medium ${
                    report.status === "Voir"
                      ? "bg-green-100 text-green-700"
                      : report.status === "Compléter"
                        ? "bg-red-100 text-red-700"
                        : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {report.status}
                </button>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className={`h-1.5 rounded-full ${report.color}`}
                  style={{ width: `${report.progress}%` }}
                />
              </div>
              <p className="mt-0.5 text-right text-xs text-gray-400">
                {report.progress}%
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs italic text-gray-400">
          Le suivi automatique des obligations réglementaires BCEAO sera
          disponible dans une prochaine version.
        </p>
      </div> */}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  badge,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: string;
  badge?: number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="relative">
          <span className="text-xl">{icon}</span>
          {badge !== undefined && badge > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {badge}
            </span>
          )}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function ActivityCard({
  value,
  label,
  icon,
  color,
}: {
  value: string;
  label: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
      <p className={`text-2xl font-bold ${color}`}>
        {icon} {value}
      </p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}
