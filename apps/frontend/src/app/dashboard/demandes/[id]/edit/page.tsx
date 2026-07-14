"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { UploadZone } from "@/components/upload-zone";
import { FundingDocument, DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_CONFIG, formatFileSize } from "@/lib/document-labels";
import { EDITABLE_STATUSES } from "@/lib/funding-status";

const CATEGORY_OPTIONS: { value: "FACTURE" | "PRET" | "EQUITY"; label: string }[] = [
  { value: "FACTURE", label: "Financement de facture" },
  { value: "PRET", label: "Prêt professionnel" },
  { value: "EQUITY", label: "Levée de fonds (equity)" },
];

const ADD_DOC_TYPE_OPTIONS = [
  { value: "FUNDING_REQUEST_ATTACHMENT", label: "Pièce jointe" },
  { value: "FINANCIAL_STATEMENT", label: "États financiers" },
  { value: "ORGANIZATION_LEGAL", label: "Document légal" },
];

function fmtAmountInput(raw: string) {
  const n = parseInt(raw.replace(/\D/g, ""), 10);
  return isNaN(n) ? "" : n.toLocaleString("fr-FR");
}

interface FundingRequestDetail {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  category: "FACTURE" | "PRET" | "EQUITY";
  amountRequested: string;
  expectedReturn: string | null;
  durationMonths: number | null;
  status: string;
}

export default function EditDemandePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notEditable, setNotEditable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<"FACTURE" | "PRET" | "EQUITY">("FACTURE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [rate, setRate] = useState("");
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const [documents, setDocuments] = useState<FundingDocument[]>([]);
  const [addDocType, setAddDocType] = useState(ADD_DOC_TYPE_OPTIONS[0].value);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const loadDocuments = useCallback(() => {
    if (!token || !id) return;
    api.get<FundingDocument[]>(`/documents/funding-request/${id}`, token).then(setDocuments).catch(() => {});
  }, [token, id]);

  useEffect(() => {
    if (!token || !id) return;
    api
      .get<FundingRequestDetail>(`/funding-requests/${id}`, token)
      .then((r) => {
        if (!EDITABLE_STATUSES.includes(r.status)) {
          setNotEditable(true);
          return;
        }
        setOrganizationId(r.organizationId);
        setCategory(r.category);
        setTitle(r.title);
        setDescription(r.description);
        setAmount(fmtAmountInput(r.amountRequested));
        setDuration(r.durationMonths ? String(r.durationMonths) : "");
        setRate(r.expectedReturn ?? "");
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Erreur de chargement."))
      .finally(() => setIsLoading(false));
  }, [token, id]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function handleDeleteDocument(docId: string) {
    if (!token) return;
    if (!window.confirm("Supprimer ce document ?")) return;
    setDeletingDocId(docId);
    try {
      await api.delete(`/documents/${docId}`, token);
      setDocuments((docs) => docs.filter((d) => d.id !== docId));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    } finally {
      setDeletingDocId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !id) return;
    setError(null);

    const amountRaw = parseInt(amount.replace(/\D/g, ""), 10);
    if (isNaN(amountRaw) || amountRaw < 1) {
      setError("Montant invalide.");
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError("Le titre et la description sont obligatoires.");
      return;
    }

    setSubmitting(true);
    try {
      const durationMonths = duration ? parseInt(duration, 10) : undefined;
      const expectedReturn = rate ? parseFloat(rate) : undefined;

      await api.patch(
        `/funding-requests/${id}`,
        {
          title: title.trim(),
          description: description.trim(),
          category,
          amountRequested: amountRaw,
          ...(durationMonths !== undefined && !isNaN(durationMonths) && { durationMonths }),
          ...(expectedReturn !== undefined && !isNaN(expectedReturn) && { expectedReturn }),
        },
        token,
      );
      router.push(`/dashboard/demandes/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <button
          onClick={() => router.push(`/dashboard/demandes/${id}`)}
          className="flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-400 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <p className="text-[18px] font-semibold tracking-tight text-slate-900">Modifier la demande</p>
      </header>

      <div className="mx-auto max-w-2xl p-8 pb-16">
        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-[13px] text-slate-400">
            Chargement...
          </div>
        )}

        {!isLoading && loadError && (
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center">
            <p className="text-[15px] font-medium text-slate-900">Demande introuvable</p>
            <p className="mt-1.5 text-[13px] text-slate-500">{loadError}</p>
          </div>
        )}

        {!isLoading && notEditable && (
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center">
            <p className="text-[15px] font-medium text-slate-900">Modification impossible</p>
            <p className="mt-1.5 max-w-sm text-[13px] text-slate-500">
              Cette demande a déjà été publiée (ou est à un stade ultérieur) et ne peut plus être modifiée.
            </p>
            <Link
              href={`/dashboard/demandes/${id}`}
              className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-blue-600 px-4 text-[13px] font-medium text-white shadow-[0_6px_16px_rgba(37,99,235,0.22)] transition hover:-translate-y-px hover:bg-blue-700"
            >
              Retour au détail
            </Link>
          </div>
        )}

        {!isLoading && !loadError && !notEditable && (
          <form onSubmit={handleSubmit} className="rounded-[18px] border border-slate-200 bg-white p-7">
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
            )}

            <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">Type de financement</label>
            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={`rounded-[10px] border-[1.5px] px-3 py-2.5 text-left text-[12px] font-semibold transition ${
                    category === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">Titre</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mb-4 h-10 w-full rounded-[10px] border border-slate-200 px-3 text-[13px] text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />

            <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="mb-4 w-full rounded-[10px] border border-slate-200 px-3 py-2.5 text-[13px] text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">Montant (F CFA)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(fmtAmountInput(e.target.value))}
                  className="h-10 w-full rounded-[10px] border border-slate-200 px-3 text-[13px] text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">Durée (mois)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="h-10 w-full rounded-[10px] border border-slate-200 px-3 text-[13px] text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {category !== "EQUITY" && (
              <div className="mb-5">
                <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">Taux proposé (%)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="h-10 w-full rounded-[10px] border border-slate-200 px-3 text-[13px] text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-blue-600 px-5 text-[13px] font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
              <Link
                href={`/dashboard/demandes/${id}`}
                className="inline-flex h-10 items-center rounded-[10px] px-4 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Annuler
              </Link>
            </div>
          </form>
        )}

        {!isLoading && !loadError && !notEditable && (
          <div className="mt-5 rounded-[18px] border border-slate-200 bg-white p-7">
            <h2 className="mb-1 text-[15px] font-bold text-slate-900">Documents</h2>
            <p className="mb-4 text-[13px] text-slate-500">Ajoutez ou retirez des pièces justificatives.</p>

            {documents.length > 0 && (
              <div className="mb-4 divide-y divide-slate-100 rounded-[10px] border border-slate-100">
                {documents.map((doc) => {
                  const dcfg = DOCUMENT_STATUS_CONFIG[doc.status] ?? DOCUMENT_STATUS_CONFIG.PENDING_REVIEW;
                  return (
                    <div key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-slate-900">{doc.fileName}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type} · {formatFileSize(doc.sizeBytes)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${dcfg.badgeClass}`}>
                          {dcfg.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          disabled={deletingDocId === doc.id}
                          title="Supprimer ce document"
                          className="text-slate-400 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {documents.length === 0 && (
              <p className="mb-4 text-[13px] text-slate-400">Aucun document déposé pour l'instant.</p>
            )}

            {organizationId && (
              <div className="flex items-center gap-2">
                <select
                  value={addDocType}
                  onChange={(e) => setAddDocType(e.target.value)}
                  className="h-9 rounded-[8px] border border-slate-200 px-2.5 text-[12px] text-slate-700 outline-none focus:border-blue-500"
                >
                  {ADD_DOC_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <UploadZone
                  organizationId={organizationId}
                  documentType={addDocType}
                  fundingRequestId={id}
                  onUploaded={loadDocuments}
                  compact
                />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
