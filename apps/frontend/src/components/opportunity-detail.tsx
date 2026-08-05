"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useNegotiationSocket } from "@/lib/use-negotiation-socket";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { UploadZone } from "@/components/upload-zone";
import { FundingDocument, DOCUMENT_STATUS_CONFIG, formatFileSize, getDocumentLabel, getStaticKycLabels } from "@/lib/document-labels";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { glossaryText } from "@/lib/financial-glossary";
import { formatAmountInput, parseAmountInput } from "@/lib/admin-ui";
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
import { alertError, alertSuccess, confirmDialog } from "@/lib/alert";

// ── types ─────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  FACTURE: "Facture",
  PRET:    "Prêt",
  EQUITY:  "Equity",
};

const CATEGORY_BADGE: Record<string, string> = {
  FACTURE: "bg-blue-100 text-blue-700",
  PRET:    "bg-green-100 text-green-700",
  EQUITY:  "bg-purple-100 text-purple-700",
};

// Libellés des champs scoringInput — mêmes clés que scoring.engine.ts (backend),
// aucune liste équivalente n'existait déjà côté frontend.
const DEBITEUR_TYPE_LABELS: Record<string, string> = {
  multinationale:    "Multinationale",
  grande_entreprise:  "Grande entreprise",
  public_solvable:    "Organisme public solvable",
  pme_etablie:        "PME établie",
  petite_structure:   "Petite structure",
  particulier:        "Particulier",
};

const DEBITEUR_SOLVABILITE_LABELS: Record<string, string> = {
  solide:   "Solide",
  neutre:   "Neutre",
  tension:  "Sous tension",
  incident: "Incident(s) de paiement",
};

const ANCIENNETE_RELATION_LABELS: Record<string, string> = {
  plus_2ans:            "Plus de 2 ans",
  "6mois_2ans":          "Entre 6 mois et 2 ans",
  premiere_transaction: "Première transaction",
};

const DELAI_PAIEMENT_LABELS: Record<string, string> = {
  a_echeance:      "Paiement à échéance",
  leger_retard:    "Léger retard habituel",
  souvent_retard:  "Retards fréquents",
};

const GARANTIE_TYPE_LABELS: Record<string, string> = {
  depot_cash:            "Dépôt de garantie en espèces",
  hypotheque:            "Hypothèque",
  nantissement_compte:   "Nantissement de compte",
  nantissement_materiel: "Nantissement de matériel",
  caution_personnelle:   "Caution personnelle",
  caution_morale:        "Caution morale",
  aucune:                "Aucune garantie",
};

// Profil de crédit + identité de l'entreprise — jamais les coordonnées
// bancaires de la PME, qui restent réservées à l'admin (décaissement/réclamation).
// Le virement de l'investisseur se fait vers un compte LeFinancier, voir
// Opportunity.platformBankAccounts ci-dessous.
interface OpportunityOrganization {
  id: string;
  legalName: string;
  sector: string | null;
  legalForm: string | null;
  foundedYear: number | null;
  city: string | null;
  address: string | null;
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
}

interface ScoreCriterion {
  key: string;
  label: string;
  weight: number;
  rawScore: number | null;
  evaluable: boolean;
  penalized: boolean;
  reliability: number;
  note: string;
}

// Volontairement plus riche que ScoringReportSummary (partagé avec les pages
// institution) : cette page a besoin du détail des critères, pas seulement du
// grade/score. On ne réutilise pas kpiSnapshot.recommendation (verdict interne
// du comité crédit, ex. "Refuser") — non pertinent sur un deal déjà publié.
interface FullScoringReport {
  grade: string;
  autoScore: string;
  confidence: string;
  coverage: string;
  kpiSnapshot: { criteria: ScoreCriterion[] };
}

// Détail propre à CETTE demande (pas au profil général de la PME) : le
// débiteur d'une facture, la garantie d'un prêt — renseigné selon la
// catégorie, jamais les deux à la fois.
interface OpportunityScoringInput {
  debiteurNom: string | null;
  debiteurType: string | null;
  debiteurSolvabilite: string | null;
  echeanceFactureDate: string | null;
  ancienneteRelation: string | null;
  partPlusGrosClient: string | null;
  delaiPaiementMenu: string | null;
  tauxImpaye12m: string | null;
  garantieType: string | null;
  garantieCouverture: string | null;
}

// Compte LeFinancier vers lequel virer les fonds — jamais un compte PME.
// Révélé par le backend uniquement une fois l'engagement confirmé.
interface PlatformBankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  swiftCode: string | null;
}

interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: string;
  amountRequested: string;
  amountRaised: string;
  expectedReturn: string | null;
  durationMonths: number | null;
  currency: string;
  investorMode: "SINGLE_INVESTOR" | "MULTIPLE_INVESTORS";
  hasActiveInvestor: boolean;
  platformBankAccounts: PlatformBankAccount[];
  publishedAt: string | null;
  closesAt: string | null;
  organization: OpportunityOrganization;
  scoringReports: FullScoringReport[];
  scoringInput: OpportunityScoringInput | null;
}

interface NegotiationOffer {
  id: string;
  proposedBy: "INVESTOR" | "PME";
  proposedReturn: string;
  conditions: string | null;
  note: string | null;
  status: string;
  createdAt: string;
}

interface MyEngagement {
  id: string;
  amountCommitted: string;
  status: string;
  lockedReturn: string | null;
  conditions: string | null;
  settlementProofId: string | null;
  settlementRejectionReason: string | null;
  negotiationOffers: NegotiationOffer[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtAmount(v: string | number) {
  return `${Number(v).toLocaleString("fr-FR")} F CFA`;
}

// Stocké en base sous forme de ratio 0–1, affiché en %.
function fmtPercent(value: string | null) {
  if (value === null || value === undefined) return "—";
  return `${(Number(value) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}

function gradeColorClass(grade: string | undefined | null) {
  if (!grade) return "text-slate-300";
  if (grade === "A+" || grade === "A") return "text-green-600";
  if (grade === "BBB") return "text-yellow-600";
  if (grade === "BB") return "text-orange-600";
  return "text-red-600";
}

function fmtDate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function labelFromMap(map: Record<string, string>, value: string | null) {
  if (!value) return "—";
  return map[value] ?? value;
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, valueClass = "text-slate-900", hint,
}: {
  label: string; value: string; icon: React.ReactNode; valueClass?: string; hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-slate-400">{icon}</span>
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        {hint && <InfoTooltip text={hint} />}
      </div>
      <p className={`text-[15px] font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function OfferStatusBadge({ status }: { status: string }) {
  if (status === "PENDING")   return <span className="text-[11px] font-semibold text-blue-600">En attente</span>;
  if (status === "ACCEPTED")  return <span className="text-[11px] font-semibold text-green-600">Accepté</span>;
  if (status === "COUNTERED") return <span className="text-[11px] text-slate-400">Contré</span>;
  if (status === "REJECTED")  return <span className="text-[11px] text-red-500">Rejeté</span>;
  return <span className="text-[11px] text-slate-400">{status}</span>;
}

const TABS = [
  { key: "finance",    label: "Analyse financière" },
  { key: "entreprise", label: "L'entreprise" },
  { key: "documents",  label: "Documents" },
] as const;

function TabBar({
  active, onChange,
}: { active: string; onChange: (tab: typeof TABS[number]["key"]) => void }) {
  return (
    <div className="flex border-b border-slate-100">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-5 py-3 text-[12px] font-bold transition ${
            active === tab.key
              ? "border-b-2 border-blue-600 text-slate-900"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, value, span2, hint }: { label: string; value: string; span2?: boolean; hint?: string }) {
  return (
    <div className={span2 ? "col-span-2" : undefined}>
      <p className="flex items-center gap-1 text-[11px] text-slate-400">
        {label}
        {hint && <InfoTooltip text={hint} />}
      </p>
      <p className="mt-0.5 break-words text-[13px] font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function BoolField({ label, value }: { label: string; value: boolean | null }) {
  return <Field label={label} value={value ? "Oui" : "Non"} />;
}

function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">{title}</p>
      <div className="grid grid-cols-3 gap-x-4 gap-y-3">{children}</div>
    </div>
  );
}

function FinanceTab({
  scoreReport, organization, scoringInput, category,
}: {
  scoreReport: FullScoringReport | null;
  organization: OpportunityOrganization;
  scoringInput: OpportunityScoringInput | null;
  category: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Scoring LeFinancier</p>
        {!scoreReport ? (
          <p className="text-[12px] text-slate-400">Le scoring de cette PME n&apos;est pas encore disponible.</p>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-4">
              <span className={`text-[26px] font-extrabold ${gradeColorClass(scoreReport.grade)}`}>
                {scoreReport.grade}
              </span>
              <div className="text-[11px] text-slate-500">
                <p>Score : <strong className="text-slate-900">{Math.round(Number(scoreReport.autoScore))}/100</strong></p>
                <p>Confiance : <strong className="text-slate-900">{Math.round(Number(scoreReport.confidence) * 100)}%</strong></p>
              </div>
            </div>
            <div className="space-y-2">
              {scoreReport.kpiSnapshot.criteria.map((c) => (
                <div key={c.key} className="rounded-[10px] bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-slate-700">{c.label}</span>
                    <span className="font-bold text-slate-900">
                      {c.evaluable && c.rawScore !== null ? `${Math.round(c.rawScore)}/100` : "Non évaluable"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Poids {Math.round(c.weight * 100)}%</span>
                    {c.note && <span className="truncate pl-2">{c.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {scoringInput && category === "FACTURE" && (
        <FieldSection title="Débiteur de la facture">
          <Field label="Nom du débiteur" value={scoringInput.debiteurNom || "—"} />
          <Field label="Type de débiteur" value={labelFromMap(DEBITEUR_TYPE_LABELS, scoringInput.debiteurType)} />
          <Field label="Solvabilité" value={labelFromMap(DEBITEUR_SOLVABILITE_LABELS, scoringInput.debiteurSolvabilite)} hint={glossaryText("solvabilite-debiteur")} />
          <Field label="Échéance de la facture" value={fmtDate(scoringInput.echeanceFactureDate)} />
          <Field label="Ancienneté de la relation" value={labelFromMap(ANCIENNETE_RELATION_LABELS, scoringInput.ancienneteRelation)} hint={glossaryText("anciennete-relation")} />
          <Field label="Délai de paiement habituel" value={labelFromMap(DELAI_PAIEMENT_LABELS, scoringInput.delaiPaiementMenu)} />
          <Field label="Part du plus gros client" value={fmtPercent(scoringInput.partPlusGrosClient)} hint={glossaryText("part-plus-gros-client")} />
          <Field label="Taux d'impayés (12 mois)" value={fmtPercent(scoringInput.tauxImpaye12m)} hint={glossaryText("taux-impayes")} />
        </FieldSection>
      )}

      {scoringInput && category === "PRET" && (scoringInput.garantieType || scoringInput.garantieCouverture) && (
        <FieldSection title="Garantie">
          <Field label="Type de garantie" value={labelFromMap(GARANTIE_TYPE_LABELS, scoringInput.garantieType)} />
          <Field label="Taux de couverture" value={fmtPercent(scoringInput.garantieCouverture)} hint={glossaryText("couverture-garantie")} />
        </FieldSection>
      )}

      <FieldSection title="Santé financière">
        <Field label="Cash-flow annuel" value={organization.cashFlowAnnuel ? fmtAmount(organization.cashFlowAnnuel) : "—"} hint={glossaryText("cash-flow")} />
        <Field label="Flux Mobile Money mensuel" value={organization.fluxMobileMoneyMensuel ? fmtAmount(organization.fluxMobileMoneyMensuel) : "—"} />
        <Field label="Autonomie financière" value={fmtPercent(organization.autonomieFinanciere)} hint={glossaryText("autonomie-financiere")} />
        <Field label="Taux d'endettement" value={fmtPercent(organization.tauxEndettement)} hint={glossaryText("taux-endettement")} />
        <Field label="Ratio de liquidité" value={fmtPercent(organization.ratioLiquidite)} hint={glossaryText("ratio-liquidite")} />
        <Field label="Marge brute" value={fmtPercent(organization.margeBrute)} hint={glossaryText("marge-brute")} />
        <Field label="TCAM CA sur 3 ans" value={fmtPercent(organization.tcamCa3ans)} hint={glossaryText("tcam")} />
        <Field label="Runway" value={organization.runwayMois != null ? `${organization.runwayMois} mois` : "—"} hint={glossaryText("runway")} />
        <Field label="Clients actifs" value={organization.nbClientsActifs?.toString() ?? "—"} />
      </FieldSection>

      <FieldSection title="Profil du dirigeant">
        <Field label="Expérience du dirigeant" value={organization.dirigeantExperienceAns != null ? `${organization.dirigeantExperienceAns} ans` : "—"} />
        <Field label="Expérience sectorielle" value={organization.experienceSecteurAns != null ? `${organization.experienceSecteurAns} ans` : "—"} />
        <Field
          label="Incidents légaux connus"
          value={organization.dirigeantIncidentsLegaux === "connu" ? "Incident(s) connu(s)" : organization.dirigeantIncidentsLegaux === "aucun" ? "Aucun" : "—"}
        />
        <Field label="Antécédents du dirigeant" value={organization.dirigeantAntecedents || "—"} span2 />
      </FieldSection>
    </div>
  );
}

function EntrepriseTab({ organization }: { organization: OpportunityOrganization }) {
  return (
    <div className="space-y-5">
      <FieldSection title="Identité">
        <Field label="Secteur d'activité" value={organization.sector || "—"} />
        <Field label="Forme juridique" value={organization.legalForm || "—"} />
        <Field label="Année de création" value={organization.foundedYear?.toString() ?? "—"} />
        <Field label="Ville" value={organization.city || "—"} />
        <Field label="Adresse" value={organization.address || "—"} span2 />
      </FieldSection>

      <FieldSection title="Secteur & structure">
        <Field label="Secteur d'activité (scoring)" value={labelFor(SECTEURS, organization.secteurCode)} />
        <BoolField label="Activité saisonnière" value={organization.secteurSaisonnalite} />
        <BoolField label="Import en devises" value={organization.secteurImportDevises} />
        <BoolField label="Soutien public au secteur" value={organization.secteurSoutienPublic} />
      </FieldSection>

      <FieldSection title="Équipe, gouvernance & marché">
        <Field label="Taille du marché" value={labelFor(TAILLE_MARCHE, organization.tailleMarche)} />
        <Field label="Scalabilité" value={labelFor(SCALABILITE, organization.scalabilite)} hint={glossaryText("scalabilite")} />
        <Field label="Avantage concurrentiel (moat)" value={labelFor(MOAT, organization.moat)} hint={glossaryText("moat")} />
        <Field label="Position sur le marché" value={labelFor(PART_MARCHE, organization.partMarcheRelative)} hint={glossaryText("part-marche")} />
        <Field label="Complétude de l'équipe" value={labelFor(COMPLETUDE_EQUIPE, organization.completudeEquipe)} />
        <Field label="Droits investisseurs" value={labelFor(DROITS_INVESTISSEUR, organization.droitsInvestisseur)} />
        <Field label="Transparence financière" value={labelFor(TRANSPARENCE, organization.transparence)} />
        <Field label="Track record du dirigeant" value={labelFor(TRACK_RECORD, organization.trackRecord)} hint={glossaryText("track-record")} />
      </FieldSection>
    </div>
  );
}

function DocumentsTab({
  documents,
  error,
  onPreview,
  kycLabelsByKey,
}: {
  documents: FundingDocument[];
  error: boolean;
  onPreview: (id: string) => void;
  kycLabelsByKey: Record<string, string>;
}) {
  if (error) {
    return <p className="text-center text-[12px] text-red-500">Impossible de charger les documents. Réessayez plus tard.</p>;
  }
  if (documents.length === 0) {
    return <p className="text-center text-[12px] text-slate-400">Aucun document disponible pour cette opportunité.</p>;
  }
  return (
    <div className="divide-y divide-slate-100">
      {documents.map((doc) => {
        const dcfg = DOCUMENT_STATUS_CONFIG[doc.status] ?? DOCUMENT_STATUS_CONFIG.PENDING_REVIEW;
        return (
          <div key={doc.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-slate-900">{doc.fileName}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {getDocumentLabel(doc, kycLabelsByKey)} · {formatFileSize(doc.sizeBytes)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${dcfg.badgeClass}`}>
                {dcfg.label}
              </span>
              <button
                onClick={() => onPreview(doc.id)}
                className="rounded-[8px] border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Voir
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── composant ─────────────────────────────────────────────────────────────────

// Partagé entre /investor/opportunites/[id] et /institution/deal-flow/[id] :
// même logique de négociation des deux côtés, seul le point de retour diffère
// (chacun doit rester dans son propre shell — sidebar investisseur ou institution).
export function OpportunityDetail({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [engagement, setEngagement]   = useState<MyEngagement | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [amountMode, setAmountMode]         = useState<"amount" | "percent">("amount");
  const [amount, setAmount]                 = useState("");
  const [percent, setPercent]               = useState("");
  const [proposedReturn, setProposedReturn] = useState("");
  const [conditions, setConditions]         = useState("");
  const [note, setNote]                     = useState("");
  const [counterReturn, setCounterReturn]   = useState("");
  const [counterConditions, setCounterConditions] = useState("");
  const [counterNote, setCounterNote]       = useState("");
  const [isSubmitting, setIsSubmitting]     = useState(false);

  const [isFavorited, setIsFavorited]       = useState(false);
  const [favLoading, setFavLoading]         = useState(false);
  const [isSettling, setIsSettling]         = useState(false);

  const [activeTab, setActiveTab] = useState<"finance" | "entreprise" | "documents">("finance");
  const [documents, setDocuments] = useState<FundingDocument[]>([]);
  const [documentsError, setDocumentsError] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  // Plusieurs exigences KYC (Bilan N-2, Bilan N-1, Attestation fiscale...) partagent le
  // même DocumentType FINANCIAL_STATEMENT — kycRequirementKey permet de les distinguer
  // à l'affichage (cf. getDocumentLabel), sinon elles apparaissent toutes identiques.
  // On utilise la carte statique (voir getStaticKycLabels) plutôt que
  // /documents/organization/:id/kyc-status : cet endpoint est réservé aux membres de
  // l'organisation et à l'admin, alors que cette page est aussi vue par un
  // investisseur/une institution externes à l'organisation.
  const kycLabelsByKey = useMemo(() => getStaticKycLabels(), []);

  async function refreshEngagement() {
    if (!token) return;
    try {
      const eng = await api.get<MyEngagement>(`/investments/my-engagement/${id}`, token);
      setEngagement(eng);
    } catch {
      // pas encore d'engagement
    }
  }

  useNegotiationSocket(() => {
    if (!token) return;
    api
      .get<MyEngagement>(`/investments/my-engagement/${id}`, token)
      .then(setEngagement)
      .catch(() => {});
  });

  useEffect(() => {
    async function load() {
      try {
        const opp = await api.get<Opportunity>(`/funding-requests/${id}`, token ?? undefined);
        setOpportunity(opp);
        if (opp.expectedReturn) setProposedReturn(String(Number(opp.expectedReturn)));
        await refreshEngagement();
        if (token) {
          try {
            const fav = await api.get<{ favorited: boolean }>(`/watchlist/${id}/status`, token);
            setIsFavorited(fav.favorited);
          } catch { /* ignore */ }
          try {
            // Le RCCM/les bilans vivent au niveau de l'organisation (checklist
            // KYC, versée une seule fois) ; les pièces jointes propres au
            // dossier vivent sur la demande — les deux sources sont
            // pertinentes pour l'analyse d'un investisseur. Un même document
            // peut porter à la fois organizationId et fundingRequestId (ex.
            // pièce jointe à la demande) et donc apparaître dans les deux
            // réponses — dédoublonné par id ci-dessous.
            const results = await Promise.allSettled([
              api.get<FundingDocument[]>(`/documents/organization/${opp.organization.id}`, token),
              api.get<FundingDocument[]>(`/documents/funding-request/${id}`, token),
            ]);
            const merged = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
            setDocuments([...new Map(merged.map((d) => [d.id, d])).values()]);
            setDocumentsError(results.every((r) => r.status === "rejected"));
          } catch {
            setDocumentsError(true);
          }
        }
      } catch {
        setError("Impossible de charger cette opportunité.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  async function handleEngage() {
    if (!investAmount || !proposedReturn) {
      alertError("Veuillez saisir un montant et un taux.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/investments", {
        fundingRequestId: id,
        amountCommitted:  investAmount,
        proposedReturn:   Number(proposedReturn),
        conditions:       conditions.trim() || undefined,
        note:             note.trim() || undefined,
      }, token!);
      alertSuccess("Votre proposition a été envoyée à la PME.");
      await refreshEngagement();
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de l'envoi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCounter() {
    if (!engagement || !counterReturn) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/investments/${engagement.id}/counter-offer`, {
        proposedReturn: Number(counterReturn),
        conditions:     counterConditions.trim() || undefined,
        note:           counterNote.trim() || undefined,
      }, token!);
      alertSuccess("Contre-proposition envoyée.");
      setCounterReturn("");
      setCounterConditions("");
      setCounterNote("");
      await refreshEngagement();
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject() {
    if (!engagement) return;
    if (!(await confirmDialog("Mettre fin à cette négociation ? Cette action est définitive.", { confirmText: "Mettre fin" }))) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/investments/${engagement.id}/reject-offer`, {}, token!);
      alertSuccess("Négociation close.");
      await refreshEngagement();
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleProofUploaded(doc: { id: string }) {
    if (!engagement) return;
    setIsSettling(true);
    try {
      await api.patch(`/investments/${engagement.id}/settle`, { settlementProofId: doc.id }, token!);
      alertSuccess("Preuve transmise — en attente de validation par notre équipe.");
      await refreshEngagement();
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de l'envoi de la preuve.");
    } finally {
      setIsSettling(false);
    }
  }

  async function handleToggleFavorite() {
    if (!token) return;
    setFavLoading(true);
    try {
      if (isFavorited) {
        await api.delete(`/watchlist/${id}`, token);
        setIsFavorited(false);
      } else {
        await api.post(`/watchlist/${id}`, {}, token);
        setIsFavorited(true);
      }
    } catch { /* ignore */ } finally {
      setFavLoading(false);
    }
  }

  async function handleAccept() {
    if (!engagement) return;
    if (!(await confirmDialog("Accepter cette offre ? Votre engagement sera définitivement confirmé.", { confirmText: "Accepter", danger: false }))) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/investments/${engagement.id}/accept-offer`, {}, token!);
      alertSuccess("Offre acceptée ! Votre engagement est confirmé.");
      await refreshEngagement();
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── loading / error ──

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-[13px] text-slate-400">Chargement...</p>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-[13px] text-red-500">{error ?? "Opportunité introuvable."}</p>
      </div>
    );
  }

  // ── computed ──

  const requested  = Number(opportunity.amountRequested);
  const raised     = Number(opportunity.amountRaised);
  const remaining  = requested - raised;
  const progress   = requested > 0 ? Math.min(100, (raised / requested) * 100) : 0;

  const lastOffer        = engagement?.negotiationOffers?.[0] ?? null;
  const isCommitted      = engagement?.status === "COMMITTED";
  const isSettlementSubmitted = engagement?.status === "SETTLEMENT_SUBMITTED";
  const isNegotiating    = engagement?.status === "NEGOTIATING";
  const pmeHasBall       = lastOffer?.proposedBy === "PME" && lastOffer?.status === "PENDING";
  const investorWaiting  = lastOffer?.proposedBy === "INVESTOR" && lastOffer?.status === "PENDING";

  const isSingleInvestor = opportunity.investorMode === "SINGLE_INVESTOR";
  const investAmount = isSingleInvestor
    ? remaining
    : amountMode === "percent"
      ? Math.round(remaining * (Number(percent || 0) / 100))
      : (amount ? parseAmountInput(amount) || 0 : 0);
  const investPercentOfRemaining = isSingleInvestor
    ? 100
    : remaining > 0
      ? (amountMode === "percent" ? Number(percent || 0) : ((amount ? parseAmountInput(amount) || 0 : 0) / remaining) * 100)
      : 0;

  const gainEstimate  = investAmount && proposedReturn
    ? investAmount * Number(proposedReturn) / 100
    : 0;
  const totalEstimate = investAmount + gainEstimate;

  const scoreReport = opportunity.scoringReports?.[0] ?? null;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Topbar */}
      <header className="sticky top-0 z-10 flex h-15 items-center gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <button
          onClick={() => router.push(backHref)}
          className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          {backLabel}
        </button>
      </header>

      <div className="px-8 py-8">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-[22px] font-extrabold tracking-tight text-slate-900">
              {opportunity.organization.legalName}
            </p>
            <p className="text-[14px] text-slate-500">{opportunity.title}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Publié le {fmtDate(opportunity.publishedAt)}
              {opportunity.closesAt && <> · Clôture le {fmtDate(opportunity.closesAt)}</>}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${CATEGORY_BADGE[opportunity.category] ?? "bg-slate-100 text-slate-600"}`}>
              {CATEGORY_LABELS[opportunity.category] ?? opportunity.category}
            </span>
            {opportunity.investorMode === "SINGLE_INVESTOR" && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[12px] font-semibold text-amber-700">
                Investisseur unique · 100%
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-4 gap-3.5">
          <StatCard
            label="Montant"
            value={fmtAmount(opportunity.amountRequested)}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
          />
          <StatCard
            label="Rendement proposé"
            value={opportunity.expectedReturn ? `${Number(opportunity.expectedReturn)}%` : "—"}
            valueClass="text-green-600"
            hint={glossaryText("taux-rendement")}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 20.5 8.5 10.5 1 18" /></svg>}
          />
          <StatCard
            label="Durée"
            value={opportunity.durationMonths ? `${opportunity.durationMonths} mois` : "—"}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
          />
          <StatCard
            label="Score risque"
            value={scoreReport ? `${Math.round(Number(scoreReport.autoScore))}/100 · ${scoreReport.grade}` : "Non évalué"}
            valueClass={gradeColorClass(scoreReport?.grade)}
            hint={glossaryText("score-risque")}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">

          {/* Colonne principale */}
          <div className="col-span-2 space-y-4">

            {/* Description */}
            <div className="rounded-[18px] border border-slate-200 bg-white p-5">
              <p className="mb-2.5 text-[16px] font-bold text-slate-900">Description du projet</p>
              <p className="text-[13px] leading-relaxed text-slate-600">{opportunity.description}</p>
            </div>

            {/* Progression */}
            <div className="rounded-[18px] border border-slate-200 bg-white p-5">
              <p className="mb-3 text-[16px] font-bold text-slate-900">Progression du financement</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                <span>{fmtAmount(raised)} levés</span>
                <span className="font-semibold">{progress.toFixed(0)}%</span>
                <span>Reste {fmtAmount(remaining)}</span>
              </div>
            </div>

            {/* Onglets */}
            <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
              <TabBar active={activeTab} onChange={setActiveTab} />
              <div className="p-5">
                {activeTab === "finance" && (
                  <FinanceTab
                    scoreReport={scoreReport}
                    organization={opportunity.organization}
                    scoringInput={opportunity.scoringInput}
                    category={opportunity.category}
                  />
                )}
                {activeTab === "entreprise" && (
                  <EntrepriseTab organization={opportunity.organization} />
                )}
                {activeTab === "documents" && (
                  <DocumentsTab documents={documents} error={documentsError} onPreview={setPreviewDocId} kycLabelsByKey={kycLabelsByKey} />
                )}
              </div>
            </div>
          </div>

          {/* Colonne droite */}
          <div className="space-y-4">

            {/* Évaluation du risque */}
            <div className="rounded-[18px] border border-slate-200 bg-white p-5 text-center">
              <p className="mb-2 flex items-center justify-center gap-1 text-[16px] font-bold text-slate-900">
                Évaluation du risque
                <InfoTooltip text={glossaryText("score-risque")} />
              </p>
              {scoreReport ? (
                <>
                  <p className={`text-[32px] font-extrabold ${gradeColorClass(scoreReport.grade)}`}>
                    {scoreReport.grade}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Score {Math.round(Number(scoreReport.autoScore))}/100 · Confiance {Math.round(Number(scoreReport.confidence) * 100)}%
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[32px] font-extrabold text-slate-200">—</p>
                  <p className="mt-1 text-[11px] text-slate-400">Disponible avec le module scoring</p>
                </>
              )}
            </div>

            {/* Bloc engagement / négociation */}
            <div className="rounded-[18px] border border-slate-200 bg-white p-5">
              <p className="mb-0.5 text-[16px] font-bold text-slate-900">Faire une offre</p>
              <p className="mb-4 text-[11px] text-slate-500">
                Proposez un montant et un taux pour cette opportunité
              </p>

              {/* COMMITTED */}
              {isCommitted && (
                <div className="space-y-3">
                  {/* Bandeau engagement — discret, l'action de virement prime désormais */}
                  <div className="flex items-center gap-2 rounded-[10px] bg-green-50 px-4 py-2.5">
                    <svg className="shrink-0 text-green-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <p className="text-[12px] font-semibold text-green-700">
                      Engagement confirmé · Taux figé {Number(engagement?.lockedReturn)}%
                    </p>
                  </div>
                  {engagement?.conditions && (
                    <p className="text-[11px] text-slate-500">
                      <span className="font-semibold">Conditions : </span>{engagement.conditions}
                    </p>
                  )}

                  {/* Action requise — virement hors plateforme : mise en évidence forte, */}
                  {/* coordonnées + dépôt de preuve regroupés dans un seul bloc visible. */}
                  <div className={`overflow-hidden rounded-[14px] border-2 ${engagement?.settlementRejectionReason ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"}`}>
                    <div className={`flex items-center gap-2 px-4 py-3 ${engagement?.settlementRejectionReason ? "bg-red-100" : "bg-amber-100"}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={engagement?.settlementRejectionReason ? "text-red-700" : "text-amber-700"}>
                        <path d="M12 9v4M12 17h.01" />
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0Z" />
                      </svg>
                      <p className={`text-[13px] font-extrabold ${engagement?.settlementRejectionReason ? "text-red-700" : "text-amber-700"}`}>
                        {engagement?.settlementRejectionReason ? "Preuve rejetée — nouvelle soumission requise" : "Action requise · Virement hors plateforme"}
                      </p>
                    </div>

                    <div className="p-4">
                      {engagement?.settlementRejectionReason && (
                        <p className="mb-3 rounded-[8px] bg-white p-3 text-[12px] font-medium text-red-700">
                          Motif du rejet : « {engagement.settlementRejectionReason} »
                        </p>
                      )}

                      <p className="mb-3 text-[12px] font-semibold text-slate-800">
                        Montant à virer :{" "}
                        <span className="text-[15px] font-extrabold text-slate-900">
                          {fmtAmount(engagement?.amountCommitted ?? 0)}
                        </span>
                      </p>

                      {/* Comptes LeFinancier — jamais un compte PME, configurés par un admin */}
                      <div className="mb-3 space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Vers ce compte LeFinancier</p>
                        {opportunity.platformBankAccounts.length > 0 ? (
                          opportunity.platformBankAccounts.map((acc) => (
                            <div key={acc.id} className="rounded-[8px] bg-white p-3">
                              <div className="space-y-1.5 text-[12px]">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Banque</span>
                                  <span className="font-semibold text-slate-900">{acc.bankName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Titulaire du compte</span>
                                  <span className="font-semibold text-slate-900">{acc.accountHolder}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Numéro de compte / IBAN</span>
                                  <span className="font-semibold text-slate-900">{acc.accountNumber}</span>
                                </div>
                                {acc.swiftCode && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Code SWIFT/BIC</span>
                                    <span className="font-semibold text-slate-900">{acc.swiftCode}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[8px] bg-white p-3">
                            <p className="text-[12px] text-slate-400">
                              Aucun compte configuré pour le moment — contactez notre équipe pour connaître la marche à suivre.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Dépôt + soumission explicite de la preuve */}
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Une fois le virement effectué
                      </p>
                      {isSettling ? (
                        <p className="text-[12px] text-slate-500">Finalisation de la soumission...</p>
                      ) : (
                        <UploadZone
                          documentType="SETTLEMENT_PROOF"
                          fundingRequestId={opportunity.id}
                          onUploaded={handleProofUploaded}
                          compact
                          deferSubmit
                          submitLabel="Soumettre la preuve"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SETTLEMENT_SUBMITTED */}
              {isSettlementSubmitted && (
                <div className="rounded-[10px] bg-blue-50 p-4 text-center">
                  <p className="text-[13px] font-bold text-blue-700">Preuve de virement transmise</p>
                  <p className="mt-1 text-[12px] text-blue-600">En attente de validation par notre équipe.</p>
                </div>
              )}

              {/* NEGOTIATING */}
              {isNegotiating && (
                <div className="space-y-3">
                  {/* Historique */}
                  <div className="rounded-[8px] bg-slate-50 p-3">
                    <p className="mb-2 text-[11px] font-bold text-slate-700">Historique des propositions</p>
                    <div className="space-y-2">
                      {engagement!.negotiationOffers.map((offer) => (
                        <div key={offer.id} className="text-[12px]">
                          <div className={`flex items-center justify-between ${offer.status === "PENDING" ? "font-semibold text-slate-900" : "text-slate-400"}`}>
                            <span>{offer.proposedBy === "INVESTOR" ? "Vous" : "PME"}</span>
                            <span className="font-bold">{Number(offer.proposedReturn)}%</span>
                            <OfferStatusBadge status={offer.status} />
                          </div>
                          {offer.conditions && (
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              <span className="font-medium text-slate-500">Conditions : </span>{offer.conditions}
                            </p>
                          )}
                          {offer.note && (
                            <p className="mt-0.5 text-[11px] italic text-slate-400">« {offer.note} »</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {engagement!.conditions && (
                    <div className="rounded-[8px] bg-slate-50 p-3 text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-700">Conditions actuelles : </span>{engagement!.conditions}
                    </div>
                  )}

                  {/* PME a la balle — on peut accepter ou contre-proposer */}
                  {pmeHasBall && (
                    <>
                      <p className="text-[12px] text-slate-600">
                        La PME propose <strong>{Number(lastOffer!.proposedReturn)}%</strong>
                      </p>
                      <button
                        onClick={handleAccept}
                        disabled={isSubmitting}
                        className="w-full rounded-[8px] bg-green-600 py-2 text-[13px] font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                      >
                        Accepter {Number(lastOffer!.proposedReturn)}%
                      </button>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Votre contre-taux (%)"
                          value={counterReturn}
                          onChange={(e) => setCounterReturn(e.target.value)}
                          className="flex-1 rounded-[8px] border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-600"
                        />
                        <button
                          onClick={handleCounter}
                          disabled={isSubmitting || !counterReturn}
                          className="shrink-0 rounded-[8px] border border-slate-300 px-3 py-2 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Contre-proposer
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        maxLength={1000}
                        placeholder={`Conditions (optionnel — vide = inchangées : ${engagement!.conditions || "aucune"})`}
                        value={counterConditions}
                        onChange={(e) => setCounterConditions(e.target.value)}
                        className="w-full resize-none rounded-[8px] border border-slate-200 px-3 py-2 text-[12px] outline-none focus:border-blue-600"
                      />
                      <textarea
                        rows={2}
                        maxLength={1000}
                        placeholder="Message accompagnant votre contre-proposition (optionnel)"
                        value={counterNote}
                        onChange={(e) => setCounterNote(e.target.value)}
                        className="w-full resize-none rounded-[8px] border border-slate-200 px-3 py-2 text-[12px] outline-none focus:border-blue-600"
                      />
                      <button
                        onClick={handleReject}
                        disabled={isSubmitting}
                        className="w-full text-[12px] font-medium text-red-600 transition hover:underline disabled:opacity-50"
                      >
                        Refuser et clore la négociation
                      </button>
                    </>
                  )}

                  {/* On a la balle — attente PME */}
                  {investorWaiting && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 rounded-[8px] bg-amber-50 px-3 py-2.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        <p className="text-[12px] text-amber-700">En attente de la réponse de la PME…</p>
                      </div>
                      <button
                        onClick={handleReject}
                        disabled={isSubmitting}
                        className="w-full rounded-[8px] border border-red-200 py-2 text-[12px] font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        Annuler ma négociation
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SETTLED_OFF_PLATFORM — virement validé, capital effectivement investi */}
              {engagement?.status === "SETTLED_OFF_PLATFORM" && (
                <div className="rounded-[10px] bg-green-50 p-4 text-center">
                  <svg className="mx-auto mb-2 text-green-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <p className="text-[13px] font-bold text-green-700">Investissement validé</p>
                  <p className="text-[12px] text-green-600">
                    {fmtAmount(engagement.amountCommitted)}
                    {requested > 0 && ` (${((Number(engagement.amountCommitted) / requested) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}% du montant demandé)`}
                  </p>
                  <p className="mt-1 text-[12px] text-green-600">
                    Virement confirmé
                    {engagement.lockedReturn ? ` — taux figé ${Number(engagement.lockedReturn)}%` : ""}
                  </p>
                </div>
              )}

              {/* CANCELLED — engagement annulé par l'une des deux parties après confirmation */}
              {engagement?.status === "CANCELLED" && (
                <div className="rounded-[10px] bg-slate-50 p-4 text-center">
                  <p className="text-[13px] font-semibold text-slate-500">Engagement annulé</p>
                </div>
              )}

              {/* REJECTED — négociation close par l'une des deux parties */}
              {engagement?.status === "REJECTED" && (
                <div className="rounded-[10px] bg-slate-50 p-4 text-center">
                  <p className="text-[13px] font-semibold text-slate-500">Négociation close</p>
                  <p className="mt-1 text-[12px] text-slate-400">
                    Cette négociation a été abandonnée avant tout accord sur le taux.
                  </p>
                </div>
              )}

              {/* Pas encore d'engagement */}
              {!engagement && remaining <= 0 && (
                <div className="rounded-[10px] bg-slate-50 p-4 text-center">
                  <p className="text-[13px] font-semibold text-slate-500">Financement complet</p>
                  <p className="mt-1 text-[12px] text-slate-400">
                    Cette opportunité est entièrement souscrite.
                  </p>
                </div>
              )}

              {!engagement && isSingleInvestor && opportunity.hasActiveInvestor && remaining > 0 && (
                <div className="rounded-[10px] bg-slate-50 p-4 text-center">
                  <p className="text-[13px] font-semibold text-slate-500">Déjà en négociation exclusive</p>
                  <p className="mt-1 text-[12px] text-slate-400">
                    Cette PME veut un investisseur unique pour 100% du montant, et négocie déjà avec un autre investisseur. Cette opportunité n&apos;est plus disponible.
                  </p>
                </div>
              )}

              {!engagement && remaining > 0 && !(isSingleInvestor && opportunity.hasActiveInvestor) && (
                <div className="space-y-3">
                  {isSingleInvestor && (
                    <div className="rounded-[8px] bg-amber-50 px-3 py-2.5 text-[12px] text-amber-700">
                      Cette PME souhaite un investisseur unique pour 100% du montant — votre engagement portera sur la totalité, sans possibilité de partage.
                    </div>
                  )}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-700">Montant</label>
                      {!isSingleInvestor && (
                        <div className="flex rounded-[6px] border border-slate-200 p-0.5 text-[10px] font-semibold">
                          <button
                            type="button"
                            onClick={() => setAmountMode("amount")}
                            className={`rounded-[4px] px-2 py-0.5 transition ${amountMode === "amount" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
                          >
                            F CFA
                          </button>
                          <button
                            type="button"
                            onClick={() => setAmountMode("percent")}
                            className={`rounded-[4px] px-2 py-0.5 transition ${amountMode === "percent" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
                          >
                            %
                          </button>
                        </div>
                      )}
                    </div>

                    {isSingleInvestor ? (
                      <input
                        value={remaining.toLocaleString("fr-FR")}
                        readOnly
                        className="w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-500 outline-none"
                      />
                    ) : amountMode === "percent" ? (
                      <>
                        <input
                          type="number"
                          placeholder="Ex : 25"
                          value={percent}
                          max={100}
                          min={0}
                          onChange={(e) => setPercent(e.target.value)}
                          className="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-600"
                        />
                        <p className="mt-1 text-[11px] text-slate-400">
                          = {fmtAmount(investAmount)} sur {fmtAmount(remaining)} restants
                        </p>
                      </>
                    ) : (
                      <>
                        <input
                          inputMode="numeric"
                          placeholder={`Max : ${remaining.toLocaleString("fr-FR")}`}
                          value={amount}
                          onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                          className="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-600"
                        />
                        <p className="mt-1 text-[11px] text-slate-400">
                          = {investPercentOfRemaining.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}% du montant restant
                        </p>
                      </>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">Taux proposé (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={proposedReturn}
                      onChange={(e) => setProposedReturn(e.target.value)}
                      className="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-600"
                    />
                    {opportunity.expectedReturn && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        Taux PME : {Number(opportunity.expectedReturn)}%
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                      Conditions d&apos;investissement <span className="font-normal text-slate-400">(optionnel)</span>
                    </label>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      placeholder="Garanties demandées, calendrier de versement, clauses spécifiques…"
                      value={conditions}
                      onChange={(e) => setConditions(e.target.value)}
                      className="w-full resize-none rounded-[8px] border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                      Message <span className="font-normal text-slate-400">(optionnel)</span>
                    </label>
                    <textarea
                      rows={2}
                      maxLength={1000}
                      placeholder="Contexte, justification de votre offre…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full resize-none rounded-[8px] border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-600"
                    />
                  </div>

                  {investAmount > 0 && proposedReturn && (
                    <div className="rounded-[8px] bg-slate-50 p-3 text-[12px]">
                      <p className="mb-2 text-[11px] font-bold text-slate-700">Récapitulatif de l&apos;offre</p>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Montant investi</span>
                        <span className="font-semibold text-slate-900">{fmtAmount(investAmount)}</span>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <span className="text-slate-500">Part du montant demandé</span>
                        <span className="font-semibold text-slate-900">
                          {requested > 0 ? ((investAmount / requested) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : 0}%
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <span className="text-slate-500">Taux proposé</span>
                        <span className="font-semibold text-slate-900">{Number(proposedReturn)}%</span>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <span className="text-slate-500">Durée</span>
                        <span className="font-semibold text-slate-900">
                          {opportunity.durationMonths ? `${opportunity.durationMonths} mois` : "—"}
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <span className="flex items-center gap-1 text-slate-500">
                          Gain estimé
                          <InfoTooltip text={glossaryText("gain-estime")} />
                        </span>
                        <span className="font-semibold text-green-600">{fmtAmount(gainEstimate)}</span>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <span className="text-slate-500">Total à recevoir</span>
                        <span className="font-bold text-slate-900">{fmtAmount(totalEstimate)}</span>
                      </div>
                      {conditions.trim() && (
                        <div className="mt-2 border-t border-slate-200 pt-2">
                          <span className="text-slate-500">Conditions : </span>
                          <span className="text-slate-700">{conditions}</span>
                        </div>
                      )}
                      {note.trim() && (
                        <div className="mt-2 border-t border-slate-200 pt-2">
                          <span className="text-slate-500">Message : </span>
                          <span className="text-slate-700">{note}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleEngage}
                    disabled={isSubmitting}
                    className="w-full rounded-[8px] bg-blue-700 py-2.5 text-[13px] font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                  >
                    {isSubmitting ? "Envoi..." : "Investir maintenant"}
                  </button>
                </div>
              )}

              {/* Bouton favoris — toujours visible */}
              <button
                onClick={handleToggleFavorite}
                disabled={favLoading}
                className={`mt-2 flex w-full items-center justify-center gap-2 rounded-[8px] border py-2.5 text-[13px] font-medium transition disabled:opacity-50 ${
                  isFavorited
                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <svg
                  width="14" height="14" viewBox="0 0 24 24"
                  fill={isFavorited ? "currentColor" : "none"}
                  stroke="currentColor" strokeWidth="2"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {isFavorited ? "Retiré des favoris" : "Ajouter à mes favoris"}
              </button>
            </div>

            {/* Aide */}
            <div className="rounded-[18px] border border-slate-200 bg-white p-5">
              <p className="mb-1 text-[16px] font-bold text-slate-900">Besoin d&apos;aide ?</p>
              <p className="mb-3 text-[11px] text-slate-500">
                Notre équipe est disponible pour vous accompagner dans votre décision.
              </p>
              <button className="w-full rounded-[8px] border border-slate-200 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50">
                Contacter un conseiller
              </button>
            </div>

          </div>
        </div>
      </div>

      {previewDocId && (
        <DocumentPreviewModal documentId={previewDocId} onClose={() => setPreviewDocId(null)} />
      )}
    </div>
  );
}
