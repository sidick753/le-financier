"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { RejectReasonModal } from "@/components/reject-reason-modal";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { ScoringSnapshotModal } from "@/components/scoring-snapshot-modal";
import { ORG_STATUS_CONFIG, formatAdminDate, formatCompactAmount, formatFullAmount, formatFileSize } from "@/lib/admin-ui";
import { useAdminBadges } from "@/lib/admin-badges-context";
import { alertError, alertSuccess } from "@/lib/alert";
import {
  SECTEURS,
  TAILLE_MARCHE,
  SCALABILITE,
  MOAT,
  PART_MARCHE,
  TRACK_RECORD,
  COMPLETUDE_EQUIPE,
  DROITS_INVESTISSEUR,
  TRANSPARENCE,
  labelFor,
} from "@/lib/credit-profile-options";

const DOC_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING_REVIEW: { label: "À vérifier", className: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Approuvé", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejeté", className: "bg-red-100 text-red-700" },
};

const GRADE_BADGE_CLASSNAMES: Record<string, string> = {
  "A+": "bg-green-100 text-green-700",
  A: "bg-green-100 text-green-700",
  BBB: "bg-yellow-100 text-yellow-700",
  BB: "bg-orange-100 text-orange-700",
  B: "bg-red-100 text-red-700",
};

interface OrganizationDetail {
  id: string;
  legalName: string;
  registrationNumber: string;
  sector: string;
  foundedYear: number | null;
  legalForm: string | null;
  address: string | null;
  city: string | null;
  country: string;
  verificationStatus: string;
  rejectionReason: string | null;
  createdAt: string;
  bankName: string | null;
  bankAccountHolder: string | null;
  bankAccountNumber: string | null;
  bankSwiftCode: string | null;
  dirigeantEstPep: boolean;

  // ── Profil de crédit — saisi par la PME dans Paramètres > Profil entreprise ──
  secteurCode: string | null;
  secteurSaisonnalite: boolean | null;
  secteurImportDevises: boolean | null;
  secteurSoutienPublic: boolean | null;
  cashFlowAnnuel: string | null;
  fluxMobileMoneyMensuel: string | null;
  autonomieFinanciere: string | null;
  tauxEndettement: string | null;
  ratioLiquidite: string | null;
  tcamCa3ans: string | null;
  margeBrute: string | null;
  runwayMois: number | null;
  nbClientsActifs: number | null;
  dirigeantExperienceAns: number | null;
  dirigeantAntecedents: string | null;
  dirigeantIncidentsLegaux: string | null;
  experienceSecteurAns: number | null;
  trackRecord: string | null;
  completudeEquipe: string | null;
  droitsInvestisseur: string | null;
  transparence: string | null;
  tailleMarche: string | null;
  scalabilite: string | null;
  moat: string | null;
  partMarcheRelative: string | null;

  members: Array<{
    id: string;
    role: string;
    user: { firstName: string; lastName: string; email: string };
  }>;
  fundingRequests: Array<{
    id: string;
    title: string;
    category: string;
    amountRequested: string;
    amountRaised: string;
    status: string;
    createdAt: string;
  }>;
  documents: Array<{
    id: string;
    type: string;
    fileName: string;
    title: string | null;
    sizeBytes: number;
    status: string;
    rejectionReason: string | null;
    createdAt: string;
  }>;
  scoringReports: Array<{
    id: string;
    product: string;
    grade: string | null;
    autoScore: string;
    createdAt: string;
  }>;
}

export default function AdminPmeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { refreshBadges } = useAdminBadges();

  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState<"reject" | "suspend" | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [snapshotReportId, setSnapshotReportId] = useState<string | null>(null);
  const [docActionLoading, setDocActionLoading] = useState<string | null>(null);
  const [docRejectId, setDocRejectId] = useState<string | null>(null);

  function load() {
    if (!token) return;
    setIsLoading(true);
    api
      .get<OrganizationDetail>(`/organizations/admin/${id}`, token)
      .then(setOrg)
      .catch(() => setError("Impossible de charger cette PME."))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [id, token]);

  async function handleVerify() {
    setActionLoading(true);
    try {
      await api.patch(`/organizations/admin/${id}/verify`, {}, token!);
      load();
      refreshBadges();
      alertSuccess("PME validée.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de la validation.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(reason: string) {
    setActionLoading(true);
    try {
      await api.patch(`/organizations/admin/${id}/reject`, { reason }, token!);
      setModal(null);
      load();
      refreshBadges();
      alertSuccess("PME rejetée.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec du rejet.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSuspend(reason: string) {
    setActionLoading(true);
    try {
      await api.patch(`/organizations/admin/${id}/suspend`, { reason }, token!);
      setModal(null);
      load();
      refreshBadges();
      alertSuccess("PME suspendue.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de la suspension.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleTogglePep(value: boolean) {
    setActionLoading(true);
    try {
      await api.patch(`/organizations/admin/${id}/compliance`, { dirigeantEstPep: value }, token!);
      load();
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de la mise à jour.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApproveDocument(docId: string) {
    setDocActionLoading(docId);
    try {
      await api.patch(`/documents/admin/${docId}/approve`, {}, token!);
      load();
      alertSuccess("Document validé.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de la validation.");
    } finally {
      setDocActionLoading(null);
    }
  }

  async function handleRejectDocument(reason: string) {
    if (!docRejectId) return;
    setDocActionLoading(docRejectId);
    try {
      await api.patch(`/documents/admin/${docRejectId}/reject`, { reason }, token!);
      setDocRejectId(null);
      load();
      alertSuccess("Document rejeté.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec du rejet.");
    } finally {
      setDocActionLoading(null);
    }
  }

  async function handleRecomputeScore() {
    setScoreLoading(true);
    try {
      await api.post(`/scoring/compute-organisation/${id}`, {}, token!);
      load();
      alertSuccess("Score recalculé.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec du recalcul.");
    } finally {
      setScoreLoading(false);
    }
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-gray-400">Chargement...</div>;
  }

  if (error || !org) {
    return <div className="p-8 text-sm text-red-500">{error ?? "PME introuvable."}</div>;
  }

  const config = ORG_STATUS_CONFIG[org.verificationStatus] ?? ORG_STATUS_CONFIG.PENDING;
  const owner = org.members.find((m) => m.role === "OWNER") ?? org.members[0];
  const pmeReport = org.scoringReports.find((r) => r.product === "ORGANISATION");

  return (
    <div className="p-8">
      <button
        onClick={() => router.push("/admin/pme")}
        className="mb-4 text-xs font-medium text-gray-500 hover:text-brand-700"
      >
        ← Retour à la liste des PME
      </button>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{org.legalName}</h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}>
              {config.label}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            RCCM {org.registrationNumber} · {org.sector} · Inscrite le {formatAdminDate(org.createdAt)}
          </p>
        </div>

        <div className="flex gap-2">
          {org.verificationStatus === "PENDING" && (
            <>
              <button
                onClick={handleVerify}
                disabled={actionLoading}
                className="rounded-md bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Valider le KYC
              </button>
              <button
                onClick={() => setModal("reject")}
                disabled={actionLoading}
                className="rounded-md border border-red-200 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Rejeter
              </button>
            </>
          )}
          {org.verificationStatus === "VERIFIED" && (
            <button
              onClick={() => setModal("suspend")}
              disabled={actionLoading}
              className="rounded-md border border-orange-200 px-4 py-2 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
            >
              Suspendre
            </button>
          )}
          {org.verificationStatus === "REJECTED" && (
            <button
              onClick={handleVerify}
              disabled={actionLoading}
              className="rounded-md bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
            >
              Réactiver
            </button>
          )}
        </div>
      </div>

      {org.rejectionReason && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="text-xs font-semibold text-red-700">Motif du rejet / de la suspension</p>
          <p className="mt-1 text-sm text-red-600">{org.rejectionReason}</p>
        </div>
      )}

      {/* Infos générales */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <InfoCard label="Forme juridique" value={org.legalForm ?? "—"} />
        <InfoCard label="Année de création" value={org.foundedYear?.toString() ?? "—"} />
        <InfoCard label="Ville" value={org.city ?? "—"} />
        <InfoCard label="Adresse" value={org.address ?? "—"} />
      </div>

      {/* Coordonnées bancaires — utilisées pour le versement des fonds levés */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-900">Coordonnées bancaires</p>
        </div>
        <div className="grid grid-cols-4 gap-4 p-5">
          <div>
            <p className="text-xs text-gray-500">Banque</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{org.bankName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Titulaire du compte</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{org.bankAccountHolder ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Numéro de compte / IBAN</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{org.bankAccountNumber ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Code SWIFT / BIC</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{org.bankSwiftCode ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Score PME indépendant — calculé une fois pour la PME (pas par demande), sert de
          critère commun au scoring de chaque demande de financement (FACTURE/PRET/EQUITY). */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Score PME indépendant</p>
          <div className="flex items-center gap-3">
            {pmeReport && (
              <button
                onClick={() => setSnapshotReportId(pmeReport.id)}
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                Voir le détail
              </button>
            )}
            <button
              onClick={handleRecomputeScore}
              disabled={scoreLoading}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {scoreLoading ? "Calcul…" : "Recalculer"}
            </button>
          </div>
        </div>
        {pmeReport ? (
          <div className="flex items-center gap-4">
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${GRADE_BADGE_CLASSNAMES[pmeReport.grade ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
              {pmeReport.grade ?? "—"}
            </span>
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(Number(pmeReport.autoScore))}
              <span className="text-sm font-normal text-gray-400">/100</span>
            </p>
            <p className="text-xs text-gray-400">Calculé le {formatAdminDate(pmeReport.createdAt)}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Score pas encore calculé pour cette PME.</p>
        )}
      </div>

      {/* Profil de crédit — saisi par la PME dans Paramètres > Profil entreprise,
          utilisé par le moteur de scoring. Doit rester lisible ici pour que
          l'admin voie exactement ce que la PME a déclaré. */}
      <div className="mb-6 space-y-4">
        <CreditSection title="Secteur & structure">
          <Field label="Secteur d'activité (scoring)" value={labelFor(SECTEURS, org.secteurCode)} />
          <BoolField label="Activité saisonnière" value={org.secteurSaisonnalite} />
          <BoolField label="Import en devises" value={org.secteurImportDevises} />
          <BoolField label="Soutien public au secteur" value={org.secteurSoutienPublic} />
        </CreditSection>

        <CreditSection title="Santé financière">
          <Field label="Cash-flow annuel" value={formatAmount(org.cashFlowAnnuel)} />
          <Field label="Flux Mobile Money mensuel" value={formatAmount(org.fluxMobileMoneyMensuel)} />
          <Field label="Autonomie financière" value={formatPercent(org.autonomieFinanciere)} />
          <Field label="Taux d'endettement" value={formatPercent(org.tauxEndettement)} />
          <Field label="Ratio de liquidité" value={formatPercent(org.ratioLiquidite)} />
          <Field label="Nombre de clients actifs" value={org.nbClientsActifs?.toString() ?? "—"} />
          <Field label="TCAM CA sur 3 ans" value={formatPercent(org.tcamCa3ans)} />
          <Field label="Marge brute" value={formatPercent(org.margeBrute)} />
          <Field label="Runway" value={org.runwayMois != null ? `${org.runwayMois} mois` : "—"} />
        </CreditSection>

        <CreditSection title="Profil du dirigeant">
          <Field label="Expérience du dirigeant" value={org.dirigeantExperienceAns != null ? `${org.dirigeantExperienceAns} ans` : "—"} />
          <Field
            label="Incidents légaux connus"
            value={org.dirigeantIncidentsLegaux === "connu" ? "Incident(s) connu(s)" : org.dirigeantIncidentsLegaux === "aucun" ? "Aucun" : "—"}
          />
          <Field label="Expérience sectorielle" value={org.experienceSecteurAns != null ? `${org.experienceSecteurAns} ans` : "—"} />
          <Field label="Track record du dirigeant" value={labelFor(TRACK_RECORD, org.trackRecord)} />
          <Field label="Antécédents du dirigeant" value={org.dirigeantAntecedents || "—"} span2 />
          <div>
            <p className="text-xs text-gray-500">Personne politiquement exposée (PEP)</p>
            <label className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-900">
              <input
                type="checkbox"
                checked={org.dirigeantEstPep}
                disabled={actionLoading}
                onChange={(e) => handleTogglePep(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-700 focus:ring-brand-700"
              />
              {org.dirigeantEstPep ? "Oui" : "Non"}
            </label>
            {org.dirigeantEstPep && (
              <p className="mt-1 text-[11px] text-amber-600">Déclenche une alerte AML à chaque virement validé.</p>
            )}
          </div>
        </CreditSection>

        <CreditSection title="Équipe, gouvernance & marché">
          <Field label="Taille du marché" value={labelFor(TAILLE_MARCHE, org.tailleMarche)} />
          <Field label="Scalabilité" value={labelFor(SCALABILITE, org.scalabilite)} />
          <Field label="Avantage concurrentiel (moat)" value={labelFor(MOAT, org.moat)} />
          <Field label="Position sur le marché" value={labelFor(PART_MARCHE, org.partMarcheRelative)} />
          <Field label="Complétude de l'équipe" value={labelFor(COMPLETUDE_EQUIPE, org.completudeEquipe)} />
          <Field label="Droits investisseurs" value={labelFor(DROITS_INVESTISSEUR, org.droitsInvestisseur)} />
          <Field label="Transparence financière" value={labelFor(TRANSPARENCE, org.transparence)} />
        </CreditSection>
      </div>

      <div className="grid grid-cols-2 gap-4 items-start">
        {/* Membres */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-5">
            <p className="text-sm font-semibold text-gray-900">Membres</p>
          </div>
          <div className="divide-y divide-gray-100">
            {org.members.length === 0 && (
              <p className="p-5 text-sm text-gray-400">Aucun membre.</p>
            )}
            {org.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {m.user.firstName} {m.user.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{m.user.email}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {m.role === "OWNER" ? "Propriétaire" : "Membre"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-5">
            <p className="text-sm font-semibold text-gray-900">Documents</p>
          </div>
          <div className="divide-y divide-gray-100">
            {org.documents.length === 0 && (
              <p className="p-5 text-sm text-gray-400">Aucun document déposé.</p>
            )}
            {org.documents.map((doc) => {
              const docConfig = DOC_STATUS_CONFIG[doc.status] ?? DOC_STATUS_CONFIG.PENDING_REVIEW;
              return (
                <div key={doc.id} className="gap-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{doc.title ?? doc.fileName}</p>
                      <p className="truncate text-xs text-gray-500">
                        {doc.title && `${doc.fileName} · `}{doc.type} · {formatFileSize(doc.sizeBytes)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${docConfig.className}`}>
                        {docConfig.label}
                      </span>
                      <button
                        onClick={() => setPreviewDocId(doc.id)}
                        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        Voir
                      </button>
                      {doc.status === "PENDING_REVIEW" && (
                        <>
                          <button
                            onClick={() => handleApproveDocument(doc.id)}
                            disabled={docActionLoading === doc.id}
                            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Valider
                          </button>
                          <button
                            onClick={() => setDocRejectId(doc.id)}
                            disabled={docActionLoading === doc.id}
                            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Rejeter
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {doc.status === "REJECTED" && doc.rejectionReason && (
                    <p className="mt-2 text-xs text-red-600">Motif : {doc.rejectionReason}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Demandes de financement */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-900">Demandes de financement</p>
        </div>
        <div className="divide-y divide-gray-100">
          {org.fundingRequests.length === 0 && (
            <p className="p-5 text-sm text-gray-400">Aucune demande de financement.</p>
          )}
          {org.fundingRequests.map((fr) => (
            <Link
              key={fr.id}
              href={`/admin/opportunites/${fr.id}`}
              className="flex items-center justify-between p-4 hover:bg-gray-50"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{fr.title}</p>
                <p className="text-xs text-gray-500">
                  {fr.category} · {formatAdminDate(fr.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {formatCompactAmount(Number(fr.amountRequested))} FCFA
                </p>
                <p className="text-xs text-gray-500">{fr.status}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {previewDocId && (
        <DocumentPreviewModal documentId={previewDocId} onClose={() => setPreviewDocId(null)} />
      )}

      {snapshotReportId && (
        <ScoringSnapshotModal reportId={snapshotReportId} onClose={() => setSnapshotReportId(null)} />
      )}

      {modal === "reject" && (
        <RejectReasonModal
          title="Rejeter cette PME"
          confirmLabel="Confirmer le rejet"
          isSubmitting={actionLoading}
          onClose={() => setModal(null)}
          onConfirm={handleReject}
        />
      )}
      {modal === "suspend" && (
        <RejectReasonModal
          title="Suspendre cette PME"
          confirmLabel="Confirmer la suspension"
          isSubmitting={actionLoading}
          onClose={() => setModal(null)}
          onConfirm={handleSuspend}
        />
      )}
      {docRejectId && (
        <RejectReasonModal
          title="Rejeter ce document"
          confirmLabel="Confirmer le rejet"
          isSubmitting={docActionLoading === docRejectId}
          onClose={() => setDocRejectId(null)}
          onConfirm={handleRejectDocument}
        />
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function formatAmount(value: string | null): string {
  if (value === null || value === undefined) return "—";
  return `${formatFullAmount(Number(value))}`;
}

// Stocké en base sous forme de ratio 0–1, affiché en %.
function formatPercent(value: string | null): string {
  if (value === null || value === undefined) return "—";
  return `${(Number(value) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}

function CreditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
      </div>
      <div className="grid grid-cols-4 gap-4 p-5">{children}</div>
    </div>
  );
}

function Field({ label, value, span2 }: { label: string; value: string; span2?: boolean }) {
  return (
    <div className={span2 ? "col-span-2" : undefined}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900 break-words">{value}</p>
    </div>
  );
}

function BoolField({ label, value }: { label: string; value: boolean | null }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value ? "Oui" : "Non"}</p>
    </div>
  );
}
