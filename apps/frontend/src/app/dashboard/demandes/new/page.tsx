"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { usePmeData } from "@/lib/use-pme-data";
import { api } from "@/lib/api";
import { UploadZone as RealUploadZone } from "@/components/upload-zone";

// ── types ─────────────────────────────────────────────────────────────────────

type FinancingType = "INVOICE" | "LOAN" | "EQUITY";

// Le backend attend un FundingCategoryDto (FACTURE, PRET, EQUITY), pas le FinancingType du front.
const CATEGORY_BY_TYPE: Record<FinancingType, "FACTURE" | "PRET" | "EQUITY"> = {
  INVOICE: "FACTURE",
  LOAN: "PRET",
  EQUITY: "EQUITY",
};

type InvestorMode = "MULTIPLE_INVESTORS" | "SINGLE_INVESTOR";

interface FormData {
  type: FinancingType;
  amount: string;
  duration: string;
  rate: string;
  title: string;
  description: string;
  objective: string;
  investorMode: InvestorMode;
}

// ── config par type ───────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<FinancingType, {
  label: string;
  desc: string;
  meta: string;
  iconBg: string;
  iconColor: string;
  durations: string[];
  showRate: boolean;
  rateHint: string;
  icon: React.ReactNode;
}> = {
  INVOICE: {
    label: "Financement de facture",
    desc: "Avancez le montant d'une facture client en attente de paiement. Idéal pour améliorer votre trésorerie.",
    meta: "Durée : 30-90 jours · Taux : 5-8%",
    iconBg: "#eff6ff", iconColor: "#2563eb",
    durations: ["30 jours", "45 jours", "60 jours", "90 jours"],
    showRate: true,
    rateHint: "Taux recommandé pour votre profil : 5-8%",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  LOAN: {
    label: "Prêt professionnel",
    desc: "Obtenez un prêt pour financer vos investissements : matériel, stocks, développement.",
    meta: "Durée : 3-24 mois · Taux : 10-20%",
    iconBg: "#f0fdf4", iconColor: "#16a34a",
    durations: ["3 mois", "6 mois", "12 mois", "24 mois"],
    showRate: true,
    rateHint: "Taux recommandé pour votre profil : 12-18%",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  EQUITY: {
    label: "Levée de fonds (Equity)",
    desc: "Cédez une part de votre capital pour financer votre croissance sans remboursement mensuel.",
    meta: "Part : 5-25% · Retour : Participation aux bénéfices",
    iconBg: "#fffbeb", iconColor: "#d97706",
    durations: ["Court terme (< 2 ans)", "Long terme (2 ans et +)"],
    showRate: false,
    rateHint: "",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
};

const STEPS = ["Type & Montant", "Détails", "Documents", "Résumé"];

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtInput(raw: string) {
  const n = parseInt(raw.replace(/\D/g, ""), 10);
  return isNaN(n) ? "" : n.toLocaleString("fr-FR");
}

function parseDurationToMonths(s: string): number | undefined {
  if (!s) return undefined;
  const jours = s.match(/(\d+)\s*jours?/i);
  if (jours) return Math.max(1, Math.round(parseInt(jours[1]) / 30));
  const mois = s.match(/(\d+)\s*mois?/i);
  if (mois) return parseInt(mois[1]);
  if (/long terme/i.test(s)) return 36;
  if (/court terme/i.test(s)) return 18;
  return undefined;
}

// ── step components ───────────────────────────────────────────────────────────

function Step1({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (k: keyof FormData, v: string) => void;
}) {
  const cfg = TYPE_CONFIG[data.type];

  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-7">
      <h2 className="mb-1 text-[15px] font-bold text-slate-900">Type de financement</h2>
      <p className="mb-5 text-[13px] text-slate-500">Sélectionnez le type de financement adapté à votre besoin</p>

      {(["INVOICE", "LOAN", "EQUITY"] as FinancingType[]).map((t) => {
        const c = TYPE_CONFIG[t];
        const selected = data.type === t;
        return (
          <label
            key={t}
            className={`mb-2.5 flex cursor-pointer items-start gap-3.5 rounded-xl border-[1.5px] p-4 transition ${
              selected ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <input
              type="radio"
              name="type"
              value={t}
              checked={selected}
              onChange={() => onChange("type", t)}
              className="sr-only"
            />
            {/* radio circle */}
            <span className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition ${selected ? "border-blue-600" : "border-slate-300"}`}>
              {selected && <span className="h-2 w-2 rounded-full bg-blue-600" />}
            </span>
            {/* icon */}
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]"
              style={{ background: c.iconBg, color: c.iconColor }}
            >
              {c.icon}
            </span>
            <div>
              <p className="text-[14px] font-bold text-slate-900">{c.label}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{c.desc}</p>
              <p className="mt-1 text-[11px] font-semibold text-blue-600">{c.meta}</p>
            </div>
          </label>
        );
      })}

      {/* Amount + Duration */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">
            Montant souhaité (FCFA) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.amount}
            onChange={(e) => onChange("amount", fmtInput(e.target.value))}
            placeholder="Ex : 10 000 000"
            inputMode="numeric"
            className="h-[42px] w-full rounded-[10px] border border-slate-200 px-3.5 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">Durée</label>
          <select
            value={data.duration}
            onChange={(e) => onChange("duration", e.target.value)}
            className="h-[42px] w-full appearance-none rounded-[10px] border border-slate-200 px-3.5 text-[13px] text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          >
            <option value="">Sélectionnez une durée</option>
            {cfg.durations.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode de financement */}
      <div className="mt-4">
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">Mode de financement</label>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              {
                value: "MULTIPLE_INVESTORS" as InvestorMode,
                label: "Plusieurs investisseurs",
                desc: "Votre montant peut être financé par plusieurs investisseurs qui se partagent le total.",
              },
              {
                value: "SINGLE_INVESTOR" as InvestorMode,
                label: "Un seul investisseur",
                desc: "Vous voulez un unique investisseur qui finance 100% du montant, sans partage.",
              },
            ]
          ).map((opt) => {
            const selected = data.investorMode === opt.value;
            return (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-xl border-[1.5px] p-3.5 transition ${
                  selected ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="investorMode"
                  value={opt.value}
                  checked={selected}
                  onChange={() => onChange("investorMode", opt.value)}
                  className="sr-only"
                />
                <p className="text-[13px] font-bold text-slate-900">{opt.label}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{opt.desc}</p>
              </label>
            );
          })}
        </div>
      </div>

      {/* Rate */}
      {cfg.showRate && (
        <div className="mt-4">
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">Taux de rendement proposé (%)</label>
          <input
            type="text"
            value={data.rate}
            onChange={(e) => onChange("rate", e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="Ex : 6.5"
            className="h-[42px] w-full rounded-[10px] border border-slate-200 px-3.5 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          />
          <p className="mt-1 text-[11px] text-slate-500">{cfg.rateHint}</p>
        </div>
      )}
    </div>
  );
}

function Step2({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-7">
      <h2 className="mb-1 text-[15px] font-bold text-slate-900">Détails de votre demande</h2>
      <p className="mb-5 text-[13px] text-slate-500">Décrivez votre besoin de financement de manière claire et détaillée</p>

      <div className="mb-4">
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">Titre de la demande</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Ex : Financement Facture client Premium"
          className="h-[42px] w-full rounded-[10px] border border-slate-200 px-3.5 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
        />
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">
          Description détaillée <span className="text-red-500">*</span>
        </label>
        <textarea
          value={data.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Décrivez votre besoin de financement, le contexte, et comment vous comptez utiliser les fonds..."
          rows={4}
          className="w-full resize-y rounded-[10px] border border-slate-200 px-3.5 py-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
        />
        <p className="mt-1 text-[11px] text-slate-500">Une description claire augmente vos chances de recevoir des offres rapidement</p>
      </div>

      <div className="mb-5">
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">Objectif d'utilisation des fonds</label>
        <input
          type="text"
          value={data.objective}
          onChange={(e) => onChange("objective", e.target.value)}
          placeholder="Ex : Achat de matériel, paiement fournisseurs, développement commercial..."
          className="h-[42px] w-full rounded-[10px] border border-slate-200 px-3.5 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
        />
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-blue-700">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Conseils pour une bonne demande
        </div>
        <ul className="space-y-0.5 text-[12px] leading-relaxed text-blue-700">
          <li>• Soyez transparent sur l'utilisation des fonds</li>
          <li>• Mentionnez vos garanties si vous en avez</li>
          <li>• Expliquez comment vous comptez rembourser</li>
          <li>• Ajoutez des chiffres concrets (CA, projections)</li>
        </ul>
      </div>
    </div>
  );
}

interface DocSlotConfig {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
  /** Non-obligatoire mais à mettre en avant explicitement — le niveau d'insistance à afficher. */
  recommended?: "Fortement recommandé" | "Recommandé";
  docType: string;
}

const DOC_SLOTS_BY_TYPE: Record<FinancingType, DocSlotConfig[]> = {
  INVOICE: [
    { key: "facture", label: "Facture client", required: true, docType: "FUNDING_REQUEST_ATTACHMENT" },
    { key: "etatsFinanciers", label: "États financiers récents", hint: "Bilan, compte de résultat (derniers 12 mois) — même non exigés, ils renforcent nettement votre dossier.", recommended: "Fortement recommandé", docType: "FINANCIAL_STATEMENT" },
    { key: "businessPlan", label: "Business plan ou prévisionnel", hint: "Document décrivant votre activité et projections — non obligatoire, mais très utile à l'analyse.", recommended: "Recommandé", docType: "FUNDING_REQUEST_ATTACHMENT" },
    { key: "autres", label: "Autres documents", hint: "Tout document supplémentaire (contrats, garanties, références...) augmente la confiance des financeurs.", recommended: "Recommandé", docType: "FUNDING_REQUEST_ATTACHMENT" },
  ],
  LOAN: [
    { key: "etatsFinanciers", label: "États financiers récents", hint: "Bilan, compte de résultat (derniers 12 mois) — déterminants pour l'analyse de votre capacité de remboursement.", recommended: "Fortement recommandé", docType: "FINANCIAL_STATEMENT" },
    { key: "businessPlan", label: "Business plan ou prévisionnel", hint: "Document décrivant votre activité et projections — non obligatoire, mais très utile à l'analyse.", recommended: "Recommandé", docType: "FUNDING_REQUEST_ATTACHMENT" },
    { key: "autres", label: "Autres documents", hint: "Tout document supplémentaire (contrats, garanties, références...) augmente la confiance des financeurs.", recommended: "Recommandé", docType: "FUNDING_REQUEST_ATTACHMENT" },
  ],
  EQUITY: [
    { key: "businessPlan", label: "Business plan / pitch deck", required: true, docType: "FUNDING_REQUEST_ATTACHMENT" },
    { key: "etatsFinanciers", label: "États financiers récents", hint: "Bilan, compte de résultat (derniers 12 mois) — même non exigés, ils renforcent nettement votre dossier.", recommended: "Fortement recommandé", docType: "FINANCIAL_STATEMENT" },
    { key: "autres", label: "Autres documents", hint: "Tout document supplémentaire (contrats, garanties, références...) augmente la confiance des financeurs.", recommended: "Recommandé", docType: "FUNDING_REQUEST_ATTACHMENT" },
  ],
};

function DocSlot({ slot, uploaded, onUploaded, organizationId, fundingRequestId }: {
  slot: DocSlotConfig;
  uploaded: boolean;
  onUploaded: () => void;
  organizationId: string;
  fundingRequestId: string;
}) {
  return (
    <div
      className={`mb-3.5 flex items-center justify-between gap-3 rounded-[14px] border-[1.5px] p-4 transition ${
        uploaded ? "border-green-500 bg-green-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[13px] font-bold text-slate-900">{slot.label}</p>
          {slot.required && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
              OBLIGATOIRE
            </span>
          )}
          {!slot.required && slot.recommended && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                slot.recommended === "Fortement recommandé"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {slot.recommended.toUpperCase()}
            </span>
          )}
        </div>
        {slot.hint && <p className="mt-0.5 text-[12px] text-blue-600">{slot.hint}</p>}
        {!slot.required && (
          <p className="mt-0.5 text-[11px] text-slate-400">
            Non obligatoire, mais chaque document ajouté renforce sérieusement votre dossier.
          </p>
        )}
      </div>
      {uploaded ? (
        <span className="shrink-0 text-[12px] font-semibold text-green-600">✓ Ajouté</span>
      ) : (
        <RealUploadZone
          organizationId={organizationId}
          documentType={slot.docType}
          fundingRequestId={fundingRequestId}
          onUploaded={onUploaded}
          compact
        />
      )}
    </div>
  );
}

function Step3({ data, organizationId, fundingRequestId, docs, onDocUploaded }: {
  data: FormData;
  organizationId: string | null;
  fundingRequestId: string | null;
  docs: Record<string, boolean>;
  onDocUploaded: (key: string) => void;
}) {
  const slots = DOC_SLOTS_BY_TYPE[data.type];
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-7">
      <h2 className="mb-1 text-[15px] font-bold text-slate-900">Documents justificatifs</h2>
      <p className="mb-5 text-[13px] text-slate-500">
        Ajoutez les documents qui appuient votre demande. Même ceux qui ne sont pas obligatoires sont très
        importants : ils accélèrent l'analyse et augmentent vos chances d'obtenir une offre.
      </p>
      {!organizationId || !fundingRequestId ? (
        <p className="text-[13px] text-slate-400">Préparation de votre dossier...</p>
      ) : (
        slots.map((slot) => (
          <DocSlot
            key={slot.key}
            slot={slot}
            uploaded={docs[slot.key] ?? false}
            onUploaded={() => onDocUploaded(slot.key)}
            organizationId={organizationId}
            fundingRequestId={fundingRequestId}
          />
        ))
      )}
    </div>
  );
}

function Step4({ data }: { data: FormData }) {
  const cfg = TYPE_CONFIG[data.type];
  const amountRaw = parseInt(data.amount.replace(/\s/g, ""), 10);
  const amountFmt = isNaN(amountRaw) ? "—" : amountRaw.toLocaleString("fr-FR") + " F CFA";

  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-7">
      <h2 className="mb-1 text-[15px] font-bold text-slate-900">Résumé de votre demande</h2>
      <p className="mb-5 text-[13px] text-slate-500">Vérifiez les informations avant de publier</p>

      {/* Finance grid */}
      <div className="mb-5 grid grid-cols-2 gap-4 rounded-[14px] bg-slate-100 p-5">
        {[
          { label: "Type", value: cfg.label },
          { label: "Montant", value: amountFmt },
          { label: "Durée", value: data.duration || "—" },
          { label: "Taux proposé", value: cfg.showRate ? (data.rate ? data.rate + " %" : "—") : "Participation aux bénéfices" },
          {
            label: "Mode de financement",
            value: data.investorMode === "SINGLE_INVESTOR" ? "Investisseur unique (100%)" : "Plusieurs investisseurs",
          },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="mb-1 text-[11px] font-medium text-slate-500">{label}</p>
            <p className="text-[14px] font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="mb-5 space-y-3">
        {[
          { label: "Titre", value: data.title || "—" },
          { label: "Description", value: data.description || "—" },
          { label: "Objectif", value: data.objective || "—" },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="mb-0.5 text-[11px] font-medium text-slate-500">{label}</p>
            <p className="text-[13px] font-bold text-slate-900 break-words">{value}</p>
          </div>
        ))}
      </div>

      {/* Ready box */}
      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-green-700">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Prêt à soumettre !
        </div>
        <p className="text-[12px] leading-relaxed text-green-800">
          Votre demande sera envoyée en révision. Une fois validée par notre équipe, elle sera publiée et visible par les investisseurs de la plateforme.
        </p>
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

const INITIAL: FormData = {
  type: "INVOICE",
  amount: "",
  duration: "",
  rate: "",
  title: "",
  description: "",
  objective: "",
  investorMode: "MULTIPLE_INVESTORS",
};

export default function NewDemandePage() {
  const router = useRouter();
  const { token } = useAuth();
  const { organization } = usePmeData();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [docs, setDocs] = useState<Record<string, boolean>>({});

  function onChange(k: keyof FormData, v: string) {
    setData((d) => ({ ...d, [k]: v }));
  }

  function validate(): boolean {
    if (step === 1 && !data.amount.trim()) {
      setError("Veuillez entrer le montant souhaité.");
      return false;
    }
    if (step === 2 && !data.description.trim()) {
      setError("Veuillez rédiger une description détaillée.");
      return false;
    }
    if (step === 3) {
      const missing = DOC_SLOTS_BY_TYPE[data.type].filter((slot) => slot.required && !docs[slot.key]);
      if (missing.length > 0) {
        setError(`Document(s) obligatoire(s) manquant(s) : ${missing.map((s) => s.label).join(", ")}.`);
        return false;
      }
    }
    setError(null);
    return true;
  }

  // Construit le payload FundingRequest à partir des champs du formulaire —
  // réutilisé pour créer le brouillon (avant l'étape documents) et pour la
  // soumission finale.
  function buildPayload() {
    const amountRaw = parseInt(data.amount.replace(/\s/g, ""), 10);
    const typeLabel = TYPE_CONFIG[data.type].label;
    const title = data.title.trim() || `${typeLabel} — ${amountRaw.toLocaleString("fr-FR")} F CFA`;

    // Combine description + objective into a single field (backend has one description field)
    const description = data.objective.trim()
      ? `${data.description}\n\nObjectif : ${data.objective}`
      : data.description;

    const durationMonths = parseDurationToMonths(data.duration);
    const expectedReturn = data.rate ? parseFloat(data.rate) : undefined;

    return {
      amountRaw,
      body: {
        title,
        description,
        category: CATEGORY_BY_TYPE[data.type],
        amountRequested: amountRaw,
        investorMode: data.investorMode,
        ...(durationMonths !== undefined && { durationMonths }),
        ...(expectedReturn !== undefined && !isNaN(expectedReturn) && { expectedReturn }),
      },
    };
  }

  async function next() {
    if (!validate()) return;

    // En quittant l'étape 2 (détails), on crée le brouillon en base pour que
    // l'étape 3 (documents) puisse réellement attacher les fichiers uploadés
    // à une demande existante.
    if (step === 2 && !createdId) {
      if (!token || !organization) {
        setError("Organisation introuvable.");
        return;
      }
      const { amountRaw, body } = buildPayload();
      if (isNaN(amountRaw) || amountRaw < 1) {
        setError("Montant invalide.");
        return;
      }
      setCreatingDraft(true);
      try {
        const created = await api.post<{ id: string }>(
          "/funding-requests",
          { organizationId: organization.id, ...body },
          token,
        );
        setCreatedId(created.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue.");
        setCreatingDraft(false);
        return;
      }
      setCreatingDraft(false);
    }

    setStep((s) => Math.min(s + 1, 4));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prev() {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (!token || !organization) return;
    setSubmitting(true);
    setError(null);
    try {
      const { amountRaw, body } = buildPayload();
      if (isNaN(amountRaw) || amountRaw < 1) {
        setError("Montant invalide.");
        return;
      }

      let id = createdId;
      if (id) {
        // Synchronise les derniers changements de champs (si l'utilisateur est
        // revenu en arrière après avoir uploadé des documents).
        await api.patch(`/funding-requests/${id}`, body, token);
      } else {
        const created = await api.post<{ id: string }>(
          "/funding-requests",
          { organizationId: organization.id, ...body },
          token,
        );
        id = created.id;
      }

      await api.patch(`/funding-requests/${id}/submit`, {}, token);

      router.push("/dashboard/demandes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  const progress = (step / 4) * 100;

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* ── Left panel ── */}
      <aside className="hidden w-[210px] shrink-0 flex-col border-r border-slate-200 bg-white p-6 md:flex">
        <div className="mb-7">
          <img src="/logo_long_sans_fond.png" alt="LeFinancier" className="h-7" />
        </div>
        <div className="mb-5">
          <div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-violet-100 text-violet-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <p className="text-[13px] font-bold text-slate-900">{organization?.legalName ?? "Mon entreprise"}</p>
          <p className="text-[12px] text-slate-500">Espace PME</p>
        </div>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour au dashboard
        </Link>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto px-8 py-10 md:px-12">
        <div className="mx-auto max-w-[680px]">

          {/* Header */}
          <div className="mb-4">
            <h1 className="text-[22px] font-black tracking-tight text-slate-900">
              Créer une demande de financement
            </h1>
            <p className="mt-1 text-[13px] font-medium text-slate-500">Étape {step} sur 4</p>
          </div>

          {/* Progress bar */}
          <div className="mb-2.5 h-[5px] w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-slate-900 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step tabs */}
          <div className="mb-5 flex border-b border-slate-200">
            {STEPS.map((label, i) => {
              const idx = i + 1;
              return (
                <div
                  key={label}
                  className={`flex-1 border-b-2 py-2 text-center text-[12px] font-semibold transition ${
                    idx === step
                      ? "border-blue-600 text-blue-600"
                      : idx < step
                      ? "border-transparent text-green-600"
                      : "border-transparent text-slate-400"
                  }`}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
          )}

          {/* Step content */}
          {step === 1 && <Step1 data={data} onChange={onChange} />}
          {step === 2 && <Step2 data={data} onChange={onChange} />}
          {step === 3 && (
            <Step3
              data={data}
              organizationId={organization?.id ?? null}
              fundingRequestId={createdId}
              docs={docs}
              onDocUploaded={(key) => setDocs((d) => ({ ...d, [key]: true }))}
            />
          )}
          {step === 4 && <Step4 data={data} />}

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-5">
            <button
              onClick={prev}
              className={`h-10 rounded-[10px] border border-slate-200 bg-white px-5 text-[13px] font-semibold text-slate-500 transition hover:border-slate-900 hover:text-slate-900 ${step === 1 ? "invisible" : ""}`}
            >
              Précédent
            </button>
            <div className="flex gap-2.5">
              {step < 4 ? (
                <button
                  onClick={next}
                  disabled={creatingDraft}
                  className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-slate-900 px-5 text-[13px] font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {creatingDraft ? "Préparation..." : "Suivant"}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-green-600 px-5 text-[13px] font-bold text-white transition hover:bg-green-700 disabled:opacity-60"
                >
                  {submitting ? "Envoi en cours..." : "Soumettre la demande"}
                </button>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
