"use client";

import Link from "next/link";
import { usePmeData, FundingRequest, ScoringReport } from "@/lib/use-pme-data";
import { useOffers } from "@/lib/use-offers";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { NotifBell } from "@/components/ui/notif-bell";
import { KycAlertBanner } from "@/components/kyc-alert-banner";
import { CompanyProfileAlertBanner } from "@/components/company-profile-alert-banner";
import { BankInfoAlertBanner } from "@/components/bank-info-alert-banner";
import { formatCompactAmount } from "@/lib/admin-ui";

const OFFER_STATUS: Record<string, { label: string; cls: string }> = {
  INTERESTED:            { label: "Intéressé",       cls: "bg-slate-100 text-slate-600" },
  NEGOTIATING:            { label: "En négociation",  cls: "bg-amber-100 text-amber-700" },
  COMMITTED:              { label: "Confirmée",       cls: "bg-green-100 text-green-700" },
  SETTLED_OFF_PLATFORM:   { label: "Réglée",          cls: "bg-blue-100 text-blue-700" },
  CANCELLED:              { label: "Annulée",         cls: "bg-slate-100 text-slate-600" },
  REJECTED:               { label: "Rejetée",         cls: "bg-red-100 text-red-600" },
};

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── status config ─────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT:        { label: "Brouillon",  cls: "bg-slate-100 text-slate-600" },
  UNDER_REVIEW: { label: "En révision", cls: "bg-amber-100 text-amber-700" },
  PUBLISHED:    { label: "Publié",     cls: "bg-blue-100 text-blue-700" },
  FUNDED:       { label: "Financé",    cls: "bg-green-100 text-green-700" },
  CLOSED:       { label: "Clôturé",    cls: "bg-slate-100 text-slate-600" },
  REJECTED:     { label: "Rejeté",     cls: "bg-red-100 text-red-600" },
  CANCELLED:    { label: "Annulé",     cls: "bg-slate-100 text-slate-600" },
};

// ── stepper helpers ───────────────────────────────────────────────────────────

const STEPS = ["Dépôt", "Validation", "Publication", "Réception des offres", "Clôture"];

const STATUS_STEP: Record<string, number> = {
  DRAFT: 0,
  UNDER_REVIEW: 1,
  PUBLISHED: 2,
  FUNDED: 4,
  CLOSED: 4,
  REJECTED: 1,
  CANCELLED: 0,
};

function getSteps(status: string) {
  const activeIdx = STATUS_STEP[status] ?? 0;
  return STEPS.map((label, i) => ({
    label,
    completed: i < activeIdx,
    active: i === activeIdx,
  }));
}

// ── activity helpers ──────────────────────────────────────────────────────────

function buildActivity(requests: FundingRequest[]) {
  return requests.slice(0, 5).map((r) => {
    const s = r.status;
    let label = "Demande déposée";
    let type: "success" | "pending" | "info" = "info";
    if (s === "UNDER_REVIEW") { label = "Dossier en révision"; type = "pending"; }
    if (s === "PUBLISHED")    { label = "Dossier publié";      type = "success"; }
    if (s === "FUNDED")       { label = "Financement accordé"; type = "success"; }
    return { label, name: r.title, time: fmtDate(r.createdAt), type };
  });
}

// ── sub-components ────────────────────────────────────────────────────────────

function ScoreCard({ report }: { report: ScoringReport | null }) {
  if (!report || report.grade === null) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="mb-3.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
          Score LeFinancier
        </p>
        <p className="text-[13px] text-slate-500">
          Pas encore de score — soumettez un dossier pour être évalué.
        </p>
      </div>
    );
  }

  const score = Math.round(Number(report.autoScore));
  const grade = report.grade;
  const gradeColor =
    grade === "A+" || grade === "A" ? "bg-green-100 text-green-700" :
    grade === "BBB" ? "bg-yellow-100 text-yellow-700" :
    grade === "BB" ? "bg-orange-100 text-orange-700" :
    "bg-red-100 text-red-600";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <p className="mb-3.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
        Score LeFinancier
      </p>
      <div className="mb-4 flex items-center gap-4">
        <div className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] text-2xl font-bold ${gradeColor}`}>
          {grade}
        </div>
        <div>
          <p className="text-[36px] font-bold leading-none tracking-tight">
            {score}<span className="text-sm font-medium text-slate-400">/100</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Score LeFinancier</p>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, background: "linear-gradient(90deg, #2563eb, #818cf8)" }}
        />
      </div>
    </div>
  );
}

function StatusCard({ latestRequest }: { latestRequest: FundingRequest | null }) {
  if (!latestRequest) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-30">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p className="text-[13px] text-slate-500">Aucun dossier déposé pour l'instant.</p>
        <Link href="/dashboard/demandes" className="mt-2 text-sm font-bold text-blue-600 hover:underline">
          Déposer votre première demande →
        </Link>
      </div>
    );
  }

  const steps = getSteps(latestRequest.status);
  const completedCount = steps.filter((s) => s.completed).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <p className="mb-5 text-[11px] font-black uppercase tracking-widest text-slate-400">
        Statut de votre dossier en cours
      </p>
      <div className="flex items-center">
        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-1 items-center">
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border-[1.5px] px-3 py-[5px] text-[11px] font-semibold whitespace-nowrap ${
                step.completed
                  ? "border-green-500 bg-green-50 text-green-600"
                  : step.active
                  ? "border-blue-600 bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
                  : "border-slate-200 bg-white text-slate-400"
              }`}
            >
              {step.completed && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <span className={`mx-1 h-px flex-1 ${step.completed ? "bg-green-400" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <p className="text-xs font-medium text-slate-500">
          Étape {completedCount + 1} / {steps.length}
        </p>
        <p className="mt-0.5 text-[13px] font-semibold text-slate-900">{latestRequest.title}</p>
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { fundingRequests, scoringReport, isLoading, error } = usePmeData();
  const { offers, isLoading: offersLoading } = useOffers();

  const negotiatingCount = offers.filter((o) => o.status === "NEGOTIATING").length;

  const latestRequest = fundingRequests[0] ?? null;
  const activeRequests = fundingRequests.filter((r) => ["UNDER_REVIEW", "PUBLISHED"].includes(r.status));
  // Un brouillon n'est pas encore une demande confirmée (le formulaire de
  // création en persiste un dès l'étape 2, avant que l'utilisateur ait
  // terminé) — il ne doit pas gonfler le montant total affiché.
  const totalAmount = fundingRequests
    .filter((r) => r.status !== "DRAFT")
    .reduce((sum, r) => sum + Number(r.amountRequested), 0);
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const demandesMois = fundingRequests.filter((r) => {
    const d = new Date(r.createdAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  const activity = buildActivity(fundingRequests);

  return (
    <>
      {/* ── Topbar ── */}
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div>
            <p className="text-[15px] font-black tracking-tight">Dashboard</p>
            <p className="text-xs text-slate-500">Bienvenue sur votre espace PME</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/demandes/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-blue-600 px-3.5 text-[13px] font-medium text-white shadow-[0_6px_16px_rgba(37,99,235,0.22)] transition hover:-translate-y-px hover:bg-blue-700"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nouvelle demande
          </Link>
          <NotifBell />
        </div>
      </header>

      <CompanyProfileAlertBanner />
      <BankInfoAlertBanner />
      <KycAlertBanner />

      {/* ── Content ── */}
      <div className="p-8 pb-16">
        {error && (
          <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Top row: Score + Status */}
        <div className="mb-5 grid grid-cols-2 gap-4">
          <ScoreCard report={scoringReport} />
          <StatusCard latestRequest={latestRequest} />
        </div>

        {/* KPI grid */}
        <div className="mb-5 grid grid-cols-4 gap-3.5">
          <KpiCard
            label="Demandes actives"
            value={isLoading ? "…" : String(activeRequests.length)}
            sub={demandesMois > 0 ? `+${demandesMois} ce mois-ci` : "Aucune ce mois"}
            trend={demandesMois > 0 ? "up" : ""}
            iconBg="#eff6ff"
            iconColor="#2563eb"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            }
          />
          <KpiCard
            label="Montant total"
            value={isLoading ? "…" : formatCompactAmount(totalAmount)}
            sub={totalAmount > 0 ? `${totalAmount.toLocaleString("fr-FR")} F CFA` : "Aucune demande"}
            iconBg="#f0fdf4"
            iconColor="#16a34a"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
          />
          <KpiCard
            label="Offres reçues"
            value={offersLoading ? "…" : String(offers.length)}
            sub={negotiatingCount > 0 ? `${negotiatingCount} en négociation` : "Aucune en négociation"}
            trend={negotiatingCount > 0 ? "up" : ""}
            iconBg="#f5f3ff"
            iconColor="#7c3aed"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
            }
          />
          <KpiCard
            label="Taux d'approbation"
            value="—"
            sub="Données insuffisantes"
            iconBg="#f0fdf4"
            iconColor="#16a34a"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            }
          />
        </div>

        {/* Bottom row: Demandes récentes + Offres */}
        <div className="mb-5 grid grid-cols-2 gap-4">
          <SectionCard title="Demandes récentes" action="Voir tout" actionHref="/dashboard/demandes">
            {isLoading && <p className="p-5 text-sm text-slate-400">Chargement...</p>}
            {!isLoading && fundingRequests.length === 0 && (
              <div className="flex flex-col items-center px-5 py-12 text-center text-slate-400">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-30">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                </svg>
                <p className="text-[13px]">Aucune demande pour l'instant.</p>
              </div>
            )}
            {fundingRequests.slice(0, 5).map((r) => {
              const s = STATUS[r.status] ?? STATUS.DRAFT;
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 last:border-b-0">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">{r.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {Number(r.amountRequested).toLocaleString("fr-FR")} {r.currency}
                      &nbsp;·&nbsp;{fmtDate(r.createdAt)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${s.cls}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </SectionCard>

          <SectionCard title="Offres reçues" action="Voir tout" actionHref="/dashboard/offres">
            {offersLoading && <p className="p-5 text-sm text-slate-400">Chargement...</p>}
            {!offersLoading && offers.length === 0 && (
              <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-[14px] bg-blue-50">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8">
                    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                  </svg>
                </div>
                <p className="text-[13px] font-semibold text-slate-900">Aucune offre pour l'instant</p>
                <p className="mt-1.5 max-w-[200px] text-xs leading-relaxed text-slate-500">
                  Les offres des investisseurs apparaîtront ici dès que votre demande sera visible.
                </p>
              </div>
            )}
            {!offersLoading && offers.slice(0, 5).map((o) => {
              const s = OFFER_STATUS[o.status] ?? OFFER_STATUS.INTERESTED;
              return (
                <div key={o.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-900">
                      {o.investor.firstName} {o.investor.lastName}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {Number(o.amountCommitted).toLocaleString("fr-FR")} {o.fundingRequest.currency}
                      &nbsp;·&nbsp;{o.fundingRequest.title}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${s.cls}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </SectionCard>
        </div>

        {/* Activity */}
        <SectionCard title="Activité récente">
          {activity.length === 0 && (
            <p className="px-5 py-12 text-center text-[13px] text-slate-400">Aucune activité.</p>
          )}
          {activity.map((a, i) => (
            <div key={i} className="flex items-start gap-2.5 border-b border-slate-100 px-5 py-3.5 last:border-b-0">
              <div
                className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] ${
                  a.type === "success" ? "bg-green-50 text-green-600" :
                  a.type === "pending" ? "bg-amber-50 text-amber-600" :
                  "bg-blue-50 text-blue-600"
                }`}
              >
                {a.type === "success" ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                ) : a.type === "pending" ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></svg>
                )}
              </div>
              <div>
                <p className="text-[13px] font-medium text-slate-900">
                  {a.label} — <strong>{a.name}</strong>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">{a.time}</p>
              </div>
            </div>
          ))}
        </SectionCard>
      </div>
    </>
  );
}
