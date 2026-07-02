"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { usePmeData } from "@/lib/use-pme-data";
import { api } from "@/lib/api";
import { UploadZone } from "@/components/upload-zone";

const STEPS = ["Montant & Durée", "Détails", "Documents", "Résumé"];

const DURATIONS_FACTURE = [
  { value: "1", label: "30 jours" },
  { value: "2", label: "60 jours" },
  { value: "3", label: "90 jours" },
  { value: "6", label: "180 jours" },
];

const DEBITEUR_TYPES = [
  { value: "grande_entreprise", label: "Grande entreprise privée" },
  { value: "multinationale", label: "Multinationale" },
  { value: "public_solvable", label: "Entité publique solvable" },
  { value: "pme_etablie", label: "PME établie" },
  { value: "petite_structure", label: "Petite structure" },
  { value: "particulier", label: "Particulier" },
];

const DELAI_PAIEMENT_OPTIONS = [
  { value: "a_echeance", label: "À l'échéance (ponctuel)" },
  { value: "leger_retard", label: "Léger retard habituel" },
  { value: "souvent_retard", label: "Souvent en retard" },
];

const GARANTIE_TYPES = [
  { value: "depot_cash", label: "Dépôt cash" },
  { value: "nantissement_compte", label: "Nantissement de compte" },
  { value: "hypotheque", label: "Hypothèque (bien immobilier)" },
  { value: "nantissement_materiel", label: "Nantissement de matériel" },
  { value: "caution_personnelle", label: "Caution personnelle" },
  { value: "caution_morale", label: "Caution morale" },
  { value: "aucune", label: "Aucune garantie" },
];

const SECTEURS = [
  { value: "services_essentiels", label: "Services essentiels / Santé / Éducation" },
  { value: "agro",                label: "Agriculture / Distribution alimentaire" },
  { value: "commerce_detail",     label: "Commerce de détail" },
  { value: "btp",                 label: "BTP / Transport & Logistique" },
  { value: "import_export",       label: "Import / Export" },
  { value: "commerce_mono",       label: "Commerce mono / Saisonnier" },
  { value: "volatil",             label: "Secteur volatil" },
];

function computeAdvanceRate(debiteurType: string, anciennete: string, partClient: number) {
  if (!debiteurType) return null;
  const baseByType: Record<string, number> = {
    grande_entreprise: 80,
    multinationale: 80,
    public_solvable: 75,
    pme_etablie: 65,
    petite_structure: 50,
    particulier: 40,
  };
  let rate = baseByType[debiteurType] ?? 60;
  if (anciennete === "plus_2ans") rate = Math.min(rate + 5, 90);
  if (anciennete === "premiere_transaction") rate = Math.max(rate - 10, 30);
  if (partClient > 0.5) rate = Math.max(rate - 5, 30);
  return rate;
}

function computeAdvanceRange(debiteurType: string): [number, number] | null {
  const rangeByType: Record<string, [number, number]> = {
    grande_entreprise: [80, 90],
    multinationale:    [80, 90],
    public_solvable:   [70, 80],
    pme_etablie:       [60, 70],
    petite_structure:  [45, 55],
    particulier:       [35, 45],
  };
  return rangeByType[debiteurType] ?? null;
}

function computeConfidence(docs: Record<string, boolean>, category: string): number {
  if (category === "PRET") {
    let score = 0;
    if (docs.mobileMoney) score += 30;
    if (docs.etatsFinanciers) score += 25;
    if (docs.justificatifGarantie) score += 20;
    if (docs.rccm) score += 15;
    if (docs.businessPlan) score += 10;
    return score;
  }
  if (category === "EQUITY") {
    let score = 0;
    if (docs.businessPlan) score += 40;
    if (docs.etatsFinanciers) score += 25;
    if (docs.statuts) score += 15;
    if (docs.rccm) score += 10;
    if (docs.mobileMoney) score += 10;
    return score;
  }
  let score = 0;
  if (docs.facture) score += 40;
  if (docs.bonCommande) score += 25;
  if (docs.mobileMoney) score += 20;
  if (docs.etatsFinanciers) score += 10;
  if (docs.rccm) score += 5;
  return score;
}

function computeMensualite(montant: number, tauxAnnuel: number, dureeeMois: number): number {
  if (!montant || !dureeeMois) return 0;
  const r = tauxAnnuel / 100 / 12;
  if (r === 0) return montant / dureeeMois;
  return (montant * r) / (1 - Math.pow(1 + r, -dureeeMois));
}

function DocItem({ doc, docs, setDocs, organization, createdFundingRequestId }: {
  doc: { key: string; label: string; badge: string; badgeClass: string; desc: string; subdesc: string; docType: string };
  docs: Record<string, boolean>;
  setDocs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  organization: { id: string } | null;
  createdFundingRequestId: string | null;
}) {
  const provided = docs[doc.key] ?? false;
  return (
    <div className={`rounded-xl border p-4 ${provided ? "border-green-200 bg-green-50" : "border-gray-200"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">📄</span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900">{doc.label}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${doc.badgeClass}`}>
                {doc.badge}
              </span>
            </div>
            <p className="text-xs text-gray-600">{doc.desc}</p>
            <p className="text-xs text-gray-400">{doc.subdesc}</p>
          </div>
        </div>
        {provided ? (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">✓ Déposé</span>
        ) : organization && createdFundingRequestId ? (
          <UploadZone
            organizationId={organization.id}
            documentType={doc.docType}
            fundingRequestId={createdFundingRequestId}
            onUploaded={() => setDocs((d) => ({ ...d, [doc.key]: true }))}
            compact
          />
        ) : (
          <span className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-400">
            Disponible à l'étape suivante
          </span>
        )}
      </div>
    </div>
  );
}

export default function NouvelleDemandeFormPage() {
  const { category } = useParams<{ category: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { organization } = usePmeData();

  const categoryUpper = category?.toUpperCase() as "FACTURE" | "PRET" | "EQUITY";
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Étape 0 — Montant & Durée
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("");

  // Étape 1 — Détails FACTURE
  const [debiteurNom, setDebiteurNom] = useState("");
  const [debiteurType, setDebiteurType] = useState("");
  const [echeanceDate, setEcheanceDate] = useState("");
  const [anciennete, setAnciennete] = useState("plus_2ans");
  const [partClient, setPartClient] = useState(7.5);
  const [delaiPaiement, setDelaiPaiement] = useState("");
  const [tauxImpaye, setTauxImpaye] = useState("");
  const [nbClients, setNbClients] = useState("");

  // Étape 1 — Détails PRET (nouvelle version simplifiée)
  const [durationSlider, setDurationSlider] = useState(9);
  const [objetFinancement, setObjetFinancement] = useState("");
  const [descriptionFonds, setDescriptionFonds] = useState("");
  const [secteurCode, setSecteurCode] = useState("");
  const [garantieType, setGarantieType] = useState("");
  const [valeurGarantie, setValeurGarantie] = useState("");
  // Champs scoring PRET avancés (non affichés dans le formulaire simplifié mais gardés pour compatibilité)
  const [cashFlow, setCashFlow] = useState("");
  const [autonomie, setAutonomie] = useState("");
  const [endettement, setEndettement] = useState("");
  const [liquidite, setLiquidite] = useState("");
  const [garantieCouverture, setGarantieCouverture] = useState("");
  const [dirigeantExp, setDirigeantExp] = useState("");
  const [dirigeantAnt, setDirigeantAnt] = useState("premiere_perenne");

  // Étape 1 — Détails EQUITY
  const [tcam, setTcam] = useState("");
  const [tailleMarche, setTailleMarche] = useState("");
  const [scalabilite, setScalabilite] = useState("");
  const [expSecteur, setExpSecteur] = useState("");
  const [trackRecord, setTrackRecord] = useState("");
  const [completudeEquipe, setCompletudeEquipe] = useState("");
  const [moat, setMoat] = useState("");
  const [partMarche, setPartMarche] = useState("");
  const [runway, setRunway] = useState("");
  const [margeBrute, setMargeBrute] = useState("");
  const [droitsInvestisseur, setDroitsInvestisseur] = useState("");
  const [transparence, setTransparence] = useState("");

  // Étape 2 — Documents (tous produits confondus)
  const [docs, setDocs] = useState<Record<string, boolean>>({
    facture: false,
    bonCommande: false,
    mobileMoney: false,
    etatsFinanciers: false,
    rccm: false,
    justificatifGarantie: false,
    businessPlan: false,
    statuts: false,
  });

  const [createdFundingRequestId, setCreatedFundingRequestId] = useState<string | null>(null);

  const advanceRate =
    categoryUpper === "FACTURE"
      ? computeAdvanceRate(debiteurType, anciennete, partClient / 100)
      : null;

  const confidence = computeConfidence(docs, categoryUpper);
  const durations = DURATIONS_FACTURE;

  const categoryLabel =
    { FACTURE: "Affacturage", PRET: "Prêt MLT", EQUITY: "Equity" }[categoryUpper] ??
    categoryUpper;

  async function handleNext() {
    if (step === 0 && !amount) {
      setError("Veuillez remplir le montant.");
      return;
    }
    if (step === 0 && categoryUpper !== "PRET" && !duration) {
      setError("Veuillez sélectionner une durée.");
      return;
    }
    setError(null);

    // Création du brouillon à la fin de l'étape Détails
    if (step === 1 && !createdFundingRequestId && organization) {
      try {
        const body: Record<string, unknown> = {
          organizationId: organization.id,
          title: categoryUpper === "PRET" && objetFinancement
            ? objetFinancement
            : `Demande ${categoryLabel} — ${new Date().toLocaleDateString("fr-FR")}`,
          description: categoryUpper === "PRET" && (objetFinancement || descriptionFonds)
            ? [objetFinancement, descriptionFonds].filter(Boolean).join(" — ")
            : `Demande de financement ${categoryLabel}`,
          category: categoryUpper,
          amountRequested: Number(amount),
          expectedReturn: expectedReturn ? Number(expectedReturn) : undefined,
          durationMonths: categoryUpper === "PRET" ? durationSlider : Number(duration),
          ...(categoryUpper === "FACTURE" && {
            debiteurNom,
            debiteurType,
            echeanceFactureDate: echeanceDate || undefined,
            ancienneteRelation: anciennete,
            partPlusGrosClient: partClient / 100,
            delaiPaiementMenu: delaiPaiement || undefined,
            tauxImpaye12m: tauxImpaye ? Number(tauxImpaye) / 100 : undefined,
            nbClientsActifs: nbClients ? Number(nbClients) : undefined,
          }),
          ...(categoryUpper === "PRET" && {
            secteurCode: secteurCode || undefined,
            garantieType: garantieType || undefined,
            garantieCouverture: valeurGarantie && amount
              ? Number(valeurGarantie) / Number(amount)
              : undefined,
          }),
          ...(categoryUpper === "EQUITY" && {
            tcamCa3ans: tcam ? Number(tcam) / 100 : undefined,
            tailleMarche: tailleMarche || undefined,
            scalabilite: scalabilite || undefined,
            experienceSecteurAns: expSecteur ? Number(expSecteur) : undefined,
            trackRecord: trackRecord || undefined,
            completudeEquipe: completudeEquipe || undefined,
            moat: moat || undefined,
            partMarcheRelative: partMarche || undefined,
            runwayMois: runway ? Number(runway) : undefined,
            margeBrute: margeBrute ? Number(margeBrute) / 100 : undefined,
            droitsInvestisseur: droitsInvestisseur || undefined,
            transparence: transparence || undefined,
          }),
        };

        const created = await api.post<{ id: string }>("/funding-requests", body, token!);
        setCreatedFundingRequestId(created.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de la création.");
        return;
      }
    }

    setStep((s) => s + 1);
  }

  function handlePrev() {
    setError(null);
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    if (!createdFundingRequestId || !token) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/funding-requests/${createdFundingRequestId}/submit`, {}, token);
      router.push("/dashboard/demandes?submitted=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la soumission.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header breadcrumb */}
      <div className="border-b border-gray-200 bg-white px-8 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            onClick={() => router.push("/dashboard/nouvelle-demande")}
            className="hover:text-gray-700"
          >
            ← Choix du financement
          </button>
          <span>/</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {categoryLabel}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Créer une demande — {categoryLabel}
        </h1>
        <p className="text-sm text-gray-500">
          Étape {step + 1} sur {STEPS.length}
        </p>

        {/* Stepper progress */}
        <div className="mb-8 mt-4">
          <div className="h-1.5 w-full rounded-full bg-gray-200">
            <div
              className="h-1.5 rounded-full bg-gray-900 transition-all"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <div className="mt-2 grid grid-cols-4 text-xs">
            {STEPS.map((label, i) => (
              <span
                key={label}
                className={`text-center ${i <= step ? "font-medium text-gray-900" : "text-gray-400"}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Formulaire principal */}
          <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-6">

            {/* ── ÉTAPE 0 — Montant & Durée ──────────────────────────────────── */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {categoryLabel} — Montant & Durée
                  </h2>
                  <p className="text-sm text-gray-500">
                    Renseignez les paramètres principaux de votre demande.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Montant souhaité (FCFA)
                  </label>
                  <input
                    type="number"
                    placeholder="Ex : 15 000 000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                  />
                  {categoryUpper === "FACTURE" && (
                    <p className="mt-1 text-xs text-gray-400">
                      Correspond au montant TTC de votre facture client.
                    </p>
                  )}
                </div>

                {categoryUpper !== "PRET" && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Durée</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                    >
                      <option value="">Sélectionnez une durée</option>
                      {categoryUpper === "EQUITY" ? (
                        <>
                          <option value="36">3 ans</option>
                          <option value="48">4 ans</option>
                          <option value="60">5 ans</option>
                          <option value="84">7 ans</option>
                        </>
                      ) : (
                        durations.map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {categoryUpper !== "EQUITY" && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Taux de rendement proposé aux investisseurs (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder={categoryUpper === "FACTURE" ? "Ex : 7.5" : "Ex : 12"}
                      value={expectedReturn}
                      onChange={(e) => setExpectedReturn(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      {categoryUpper === "FACTURE"
                        ? "Taux indicatif pour votre profil : 5 – 9 %."
                        : "Taux indicatif pour votre profil : 9 – 18 %."}
                    </p>
                  </div>
                )}

                {categoryUpper === "PRET" ? (
                  <div className="rounded-lg bg-blue-50 p-4">
                    <p className="text-sm font-medium text-blue-800">💡 Scoring automatique</p>
                    <p className="mt-1 text-xs text-blue-600">
                      Votre score de crédit sera calculé automatiquement à la soumission, visible par les investisseurs et banques partenaires.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-blue-50 p-4">
                    <p className="text-sm font-medium text-blue-800">💡 Score calculé automatiquement</p>
                    <p className="mt-1 text-xs text-blue-600">
                      LeFinancier calcule automatiquement votre score de risque après analyse complète de votre dossier.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── ÉTAPE 1 — Détails FACTURE ──────────────────────────────────── */}
            {step === 1 && categoryUpper === "FACTURE" && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">La facture à financer</h2>
                  <p className="text-sm text-gray-500">
                    Ces informations servent à évaluer le risque débiteur et à calculer votre quotité d'avance.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Montant TTC (FCFA)</label>
                  <input
                    type="number"
                    value={amount}
                    readOnly
                    className="w-full rounded-md border border-gray-100 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nom du client (débiteur)</label>
                  <input
                    type="text"
                    placeholder="Ex : Orange CI, MTN CI, SGBCI…"
                    value={debiteurNom}
                    onChange={(e) => setDebiteurNom(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Type de débiteur</label>
                  <select
                    value={debiteurType}
                    onChange={(e) => setDebiteurType(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                  >
                    <option value="">Sélectionnez le type</option>
                    {DEBITEUR_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-400">
                    Le type de débiteur influe directement sur la quotité d'avance accordée.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Échéance de la facture</label>
                  <input
                    type="date"
                    value={echeanceDate}
                    onChange={(e) => setEcheanceDate(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">Ancienneté de la relation commerciale</p>
                  <div className="space-y-2">
                    {[
                      { value: "plus_2ans",           label: "Plus de 2 ans",         hint: "Relation établie — favorable au scoring" },
                      { value: "6mois_2ans",          label: "6 mois à 2 ans",        hint: "Relation récente mais existante" },
                      { value: "premiere_transaction", label: "Première transaction",  hint: "Nouveau client — indice de confiance plus faible" },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                          anciennete === opt.value ? "border-brand-700 bg-blue-50" : "border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="anciennete"
                          value={opt.value}
                          checked={anciennete === opt.value}
                          onChange={(e) => setAnciennete(e.target.value)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                          <p className="text-xs text-gray-500">{opt.hint}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Part de ce client dans votre CA{" "}
                    <span className="font-bold">{partClient.toFixed(1)} %</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={0.5}
                    value={partClient}
                    onChange={(e) => setPartClient(Number(e.target.value))}
                    className="w-full accent-brand-700"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0 % — client marginal</span>
                    <span>100 % — client unique</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Délai habituel de paiement de ce client
                  </label>
                  <select
                    value={delaiPaiement}
                    onChange={(e) => setDelaiPaiement(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                  >
                    <option value="">Sélectionner</option>
                    {DELAI_PAIEMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Taux d'impayés sur 12 mois (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex : 2"
                      value={tauxImpaye}
                      onChange={(e) => setTauxImpaye(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Nombre de clients actifs
                    </label>
                    <input
                      type="number"
                      placeholder="Ex : 12"
                      value={nbClients}
                      onChange={(e) => setNbClients(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── ÉTAPE 1 — Détails PRET ─────────────────────────────────────── */}
            {step === 1 && categoryUpper === "PRET" && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Caractéristiques du prêt</h2>
                  <p className="text-sm text-gray-500">
                    Ces informations permettent d'évaluer votre capacité de remboursement et de sélectionner les financeurs adaptés.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Montant souhaité (FCFA)</label>
                  <input
                    type="number"
                    value={amount}
                    readOnly
                    className="w-full rounded-md border border-gray-100 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">Montant net à débloquer hors frais.</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Durée souhaitée{" "}
                    <span className="font-bold text-brand-700">{durationSlider} mois</span>
                  </label>
                  <input
                    type="range"
                    min={6}
                    max={60}
                    step={3}
                    value={durationSlider}
                    onChange={(e) => setDurationSlider(Number(e.target.value))}
                    className="w-full accent-brand-700"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>6 mois</span>
                    <span>1 an</span>
                    <span>2 ans</span>
                    <span>3 ans</span>
                    <span>4 ans</span>
                    <span>5 ans</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Objet du financement</label>
                  <input
                    type="text"
                    placeholder="Ex : Achat d'un camion frigorifique, extension de boutique…"
                    value={objetFinancement}
                    onChange={(e) => setObjetFinancement(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-400">Information déclarative — ajoutez une pièce pour renforcer votre dossier.</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Description de l'utilisation des fonds</label>
                  <textarea
                    rows={3}
                    placeholder="Décrivez comment les fonds seront utilisés et comment vous comptez rembourser…"
                    value={descriptionFonds}
                    onChange={(e) => setDescriptionFonds(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-400">Information déclarative — ajoutez une pièce pour renforcer votre dossier.</p>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="mb-3 text-sm font-medium text-gray-700">Secteur & garanties</p>

                  <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Secteur d'activité principal</label>
                    <select value={secteurCode} onChange={(e) => setSecteurCode(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none">
                      <option value="">Sélectionner</option>
                      {SECTEURS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-400">Le secteur détermine le coefficient de risque appliqué à votre score.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Garantie proposée</label>
                      <select value={garantieType} onChange={(e) => setGarantieType(e.target.value)}
                        className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none">
                        <option value="">Sélectionner</option>
                        {GARANTIE_TYPES.map((g) => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-400">Information déclarative — ajoutez une pièce pour renforcer votre dossier.</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Valeur estimée de la garantie (FCFA)</label>
                      <input
                        type="number"
                        placeholder="Ex : 30 000 000"
                        value={valeurGarantie}
                        onChange={(e) => setValeurGarantie(e.target.value)}
                        className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                      />
                      <p className="mt-1 text-xs text-gray-400">Information déclarative — ajoutez une pièce pour renforcer votre dossier.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── ÉTAPE 1 — Détails EQUITY ───────────────────────────────────── */}
            {step === 1 && categoryUpper === "EQUITY" && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Votre entreprise & projet</h2>
                  <p className="text-sm text-gray-500">Ces données évaluent l'attractivité de votre opportunité pour les investisseurs.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">TCAM CA sur 3 ans (%)</label>
                    <input type="number" step="0.1" placeholder="Ex : 30" value={tcam} onChange={(e) => setTcam(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                    <p className="mt-1 text-xs text-gray-400">Taux de croissance annuel moyen</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Runway (mois)</label>
                    <input type="number" placeholder="Ex : 12" value={runway} onChange={(e) => setRunway(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                    <p className="mt-1 text-xs text-gray-400">Mois de trésorerie sans nouveau financement</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Taille du marché</label>
                    <select value={tailleMarche} onChange={(e) => setTailleMarche(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none">
                      <option value="">Sélectionner</option>
                      <option value="grand_croissant">Grand marché en croissance</option>
                      <option value="niche_croissante">Niche en croissance</option>
                      <option value="grand_mature">Grand marché mature</option>
                      <option value="niche_mature">Niche mature</option>
                      <option value="incertain">Incertain</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Scalabilité</label>
                    <select value={scalabilite} onChange={(e) => setScalabilite(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none">
                      <option value="">Sélectionner</option>
                      <option value="forte">Forte scalabilité</option>
                      <option value="moyenne">Scalabilité moyenne</option>
                      <option value="faible">Faible scalabilité</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Avantage concurrentiel (moat)</label>
                    <select value={moat} onChange={(e) => setMoat(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none">
                      <option value="">Sélectionner</option>
                      <option value="fort">Fort (technologie, marque, réseau)</option>
                      <option value="moderate">Modéré</option>
                      <option value="faible">Faible</option>
                      <option value="aucun">Aucun</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Position sur le marché</label>
                    <select value={partMarche} onChange={(e) => setPartMarche(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none">
                      <option value="">Sélectionner</option>
                      <option value="leader">Leader</option>
                      <option value="challenger">Challenger</option>
                      <option value="suiveur">Suiveur</option>
                      <option value="marginal">Marginal</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Marge brute (%)</label>
                  <input type="number" step="0.1" placeholder="Ex : 40" value={margeBrute} onChange={(e) => setMargeBrute(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Track record du dirigeant</label>
                    <select value={trackRecord} onChange={(e) => setTrackRecord(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none">
                      <option value="">Sélectionner</option>
                      <option value="succes_anterieur">Succès entrepreneurial antérieur</option>
                      <option value="operationnel_solide">Opérationnel solide</option>
                      <option value="premiere_aventure">Première aventure</option>
                      <option value="signaux_negatifs">Signaux négatifs</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Complétude de l'équipe</label>
                    <select value={completudeEquipe} onChange={(e) => setCompletudeEquipe(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none">
                      <option value="">Sélectionner</option>
                      <option value="complete">Équipe complète</option>
                      <option value="partielle">Équipe partielle</option>
                      <option value="fondateur_seul">Fondateur seul</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Droits investisseurs</label>
                    <select value={droitsInvestisseur} onChange={(e) => setDroitsInvestisseur(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none">
                      <option value="">Sélectionner</option>
                      <option value="solides">Droits solides (pacte d'associés complet)</option>
                      <option value="standards">Standards</option>
                      <option value="limites">Limités</option>
                      <option value="absents">Absents</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Transparence financière</label>
                    <select value={transparence} onChange={(e) => setTransparence(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none">
                      <option value="">Sélectionner</option>
                      <option value="audite">Comptes audités</option>
                      <option value="comptes_formels">Comptes formels</option>
                      <option value="declaratif">Déclaratif</option>
                      <option value="opaque">Opaque</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Expérience sectorielle du dirigeant (années)</label>
                  <input type="number" placeholder="Ex : 10" value={expSecteur} onChange={(e) => setExpSecteur(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                </div>
              </div>
            )}

            {/* ── ÉTAPE 2 — Documents ────────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Documents justificatifs</h2>
                  <p className="text-sm text-gray-500">
                    Plus vous ajoutez de pièces, plus votre indice de confiance augmente.
                  </p>
                </div>

                {categoryUpper === "FACTURE" && [
                  { key: "facture",         label: "Facture client",                    badge: "OBLIGATOIRE",          badgeClass: "bg-red-100 text-red-700",       desc: "La facture que vous souhaitez financer (PDF ou image)",           subdesc: "Pièce centrale — indispensable pour l'analyse.",                   docType: "FUNDING_REQUEST_ATTACHMENT" },
                  { key: "bonCommande",     label: "Bon de commande / PV de réception", badge: "FORTEMENT RECOMMANDÉ", badgeClass: "bg-orange-100 text-orange-700", desc: "Preuve que la livraison ou prestation est acceptée par le client", subdesc: "Réduit le risque de litige.",                                       docType: "FUNDING_REQUEST_ATTACHMENT" },
                  { key: "mobileMoney",     label: "Relevés Mobile Money — 6 mois",     badge: "RECOMMANDÉ",           badgeClass: "bg-blue-100 text-blue-700",     desc: "Orange Money, Wave, MTN MoMo ou autre portefeuille mobile",       subdesc: "Notre principale source pour évaluer votre activité réelle.",      docType: "FINANCIAL_STATEMENT" },
                  { key: "etatsFinanciers", label: "États financiers (bilan, CR)",       badge: "OPTIONNEL",            badgeClass: "bg-gray-100 text-gray-600",     desc: "Derniers 12 mois — si disponibles",                              subdesc: "Renforce la solidité du dossier si vous avez une compta formelle.", docType: "FINANCIAL_STATEMENT" },
                  { key: "rccm",            label: "Registre RCCM",                     badge: "RECOMMANDÉ",           badgeClass: "bg-blue-100 text-blue-700",     desc: "Extrait du Registre de Commerce et du Crédit Mobilier",          subdesc: "Confirme l'existence légale de votre entreprise.",                 docType: "ORGANIZATION_LEGAL" },
                ].map((doc) => <DocItem key={doc.key} doc={doc} docs={docs} setDocs={setDocs} organization={organization} createdFundingRequestId={createdFundingRequestId} />)}

                {categoryUpper === "PRET" && [
                  { key: "mobileMoney",         label: "Relevés Mobile Money — 6 mois", badge: "FORTEMENT RECOMMANDÉ", badgeClass: "bg-orange-100 text-orange-700", desc: "Orange Money, Wave, MTN MoMo ou autre portefeuille mobile",      subdesc: "Notre principale source pour évaluer votre capacité de remboursement.", docType: "FINANCIAL_STATEMENT" },
                  { key: "etatsFinanciers",     label: "États financiers (bilan, CR)",  badge: "FORTEMENT RECOMMANDÉ", badgeClass: "bg-orange-100 text-orange-700", desc: "Derniers 12 mois — bilan et compte de résultat",                subdesc: "Déterminant pour le calcul du DSCR et votre note de crédit.",           docType: "FINANCIAL_STATEMENT" },
                  { key: "justificatifGarantie",label: "Justificatif de garantie",      badge: "RECOMMANDÉ",           badgeClass: "bg-blue-100 text-blue-700",     desc: "Titre foncier, contrat de nantissement, ou attestation de dépôt", subdesc: "Augmente la quotité financée et améliore votre taux.",                 docType: "FUNDING_REQUEST_ATTACHMENT" },
                  { key: "rccm",                label: "Registre RCCM",                 badge: "RECOMMANDÉ",           badgeClass: "bg-blue-100 text-blue-700",     desc: "Extrait du Registre de Commerce et du Crédit Mobilier",          subdesc: "Confirme l'existence légale de votre entreprise.",                     docType: "ORGANIZATION_LEGAL" },
                  { key: "businessPlan",        label: "Business plan / prévisionnel",  badge: "OPTIONNEL",            badgeClass: "bg-gray-100 text-gray-600",     desc: "Projections sur 12-24 mois",                                    subdesc: "Démontre votre capacité à rembourser sur la durée.",                   docType: "FUNDING_REQUEST_ATTACHMENT" },
                ].map((doc) => <DocItem key={doc.key} doc={doc} docs={docs} setDocs={setDocs} organization={organization} createdFundingRequestId={createdFundingRequestId} />)}

                {categoryUpper === "EQUITY" && [
                  { key: "businessPlan",    label: "Business plan / pitch deck",    badge: "OBLIGATOIRE",          badgeClass: "bg-red-100 text-red-700",       desc: "Présentation du projet et projections financières",              subdesc: "Pièce centrale pour les investisseurs en equity.",                    docType: "FUNDING_REQUEST_ATTACHMENT" },
                  { key: "etatsFinanciers", label: "États financiers (bilan, CR)",  badge: "FORTEMENT RECOMMANDÉ", badgeClass: "bg-orange-100 text-orange-700", desc: "Derniers 12-24 mois",                                           subdesc: "Démontre la solidité financière actuelle.",                           docType: "FINANCIAL_STATEMENT" },
                  { key: "statuts",         label: "Statuts de la société",         badge: "RECOMMANDÉ",           badgeClass: "bg-blue-100 text-blue-700",     desc: "Statuts et pacte d'associés existant",                          subdesc: "Confirme la structure juridique et les droits des associés.",         docType: "ORGANIZATION_LEGAL" },
                  { key: "rccm",            label: "Registre RCCM",                 badge: "RECOMMANDÉ",           badgeClass: "bg-blue-100 text-blue-700",     desc: "Extrait du Registre de Commerce et du Crédit Mobilier",         subdesc: "Confirme l'existence légale de votre entreprise.",                    docType: "ORGANIZATION_LEGAL" },
                  { key: "mobileMoney",     label: "Relevés Mobile Money — 6 mois", badge: "OPTIONNEL",            badgeClass: "bg-gray-100 text-gray-600",     desc: "Orange Money, Wave, MTN MoMo ou autre portefeuille mobile",     subdesc: "Renforce la crédibilité de vos projections.",                         docType: "FINANCIAL_STATEMENT" },
                ].map((doc) => <DocItem key={doc.key} doc={doc} docs={docs} setDocs={setDocs} organization={organization} createdFundingRequestId={createdFundingRequestId} />)}
              </div>
            )}

            {/* ── ÉTAPE 3 — Résumé ──────────────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Résumé de votre demande</h2>
                  <p className="text-sm text-gray-500">
                    Vérifiez les informations avant de soumettre. Une fois soumis, le dossier passe en révision.
                  </p>
                </div>

                {/* Bloc principal */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-base">
                      {{ FACTURE: "🏷️", PRET: "🏛️", EQUITY: "📊" }[categoryUpper]}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{categoryLabel}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Montant</p>
                      <p className="font-semibold text-gray-900">
                        {Number(amount).toLocaleString("fr-FR")} FCFA
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Durée</p>
                      <p className="font-semibold text-gray-900">
                        {categoryUpper === "PRET"
                          ? `${durationSlider} mois`
                          : duration
                          ? categoryUpper === "FACTURE"
                            ? `${Number(duration) * 30} jours`
                            : `${duration} mois`
                          : "—"}
                      </p>
                    </div>
                    {/* Champ Objet — PRET */}
                    {categoryUpper === "PRET" && (
                      <div>
                        <p className="text-xs text-gray-400">Objet</p>
                        <p className="font-semibold text-gray-900">{objetFinancement || "—"}</p>
                      </div>
                    )}
                    {expectedReturn && (
                      <div>
                        <p className="text-xs text-gray-400">Taux proposé</p>
                        <p className="font-semibold text-green-600">{expectedReturn} %</p>
                      </div>
                    )}
                    {/* Secteur & Garantie — PRET */}
                    {categoryUpper === "PRET" && secteurCode && (
                      <div>
                        <p className="text-xs text-gray-400">Secteur</p>
                        <p className="font-semibold text-gray-900">
                          {SECTEURS.find((s) => s.value === secteurCode)?.label ?? secteurCode}
                        </p>
                      </div>
                    )}
                    {categoryUpper === "PRET" && garantieType && (
                      <div>
                        <p className="text-xs text-gray-400">Garantie</p>
                        <p className="font-semibold text-gray-900">
                          {GARANTIE_TYPES.find((g) => g.value === garantieType)?.label ?? garantieType}
                        </p>
                      </div>
                    )}
                    {/* Champs FACTURE */}
                    {debiteurNom && (
                      <div>
                        <p className="text-xs text-gray-400">Débiteur</p>
                        <p className="font-semibold text-gray-900">{debiteurNom}</p>
                      </div>
                    )}
                    {debiteurType && (
                      <div>
                        <p className="text-xs text-gray-400">Type débiteur</p>
                        <p className="font-semibold text-gray-900">
                          {DEBITEUR_TYPES.find((t) => t.value === debiteurType)?.label ?? debiteurType}
                        </p>
                      </div>
                    )}
                    {echeanceDate && (
                      <div>
                        <p className="text-xs text-gray-400">Échéance facture</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(echeanceDate).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    )}
                    {/* Champs EQUITY */}
                    {tcam && (
                      <div>
                        <p className="text-xs text-gray-400">TCAM CA</p>
                        <p className="font-semibold text-gray-900">{tcam} %</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Documents fournis */}
                <div>
                  <p className="mb-3 text-sm font-semibold text-gray-900">Documents fournis</p>
                  <div className="space-y-2">
                    {(categoryUpper === "FACTURE"
                      ? [
                          { key: "facture",         label: "Facture client" },
                          { key: "bonCommande",     label: "Bon de commande" },
                          { key: "mobileMoney",     label: "Relevés Mobile Money" },
                          { key: "etatsFinanciers", label: "États financiers" },
                          { key: "rccm",            label: "Registre RCCM" },
                        ]
                      : categoryUpper === "PRET"
                      ? [
                          { key: "mobileMoney",         label: "Relevés Mobile Money" },
                          { key: "etatsFinanciers",     label: "États financiers" },
                          { key: "rccm",                label: "Registre RCCM" },
                          { key: "justificatifGarantie",label: "Justificatif de garantie" },
                          { key: "businessPlan",        label: "Business plan" },
                        ]
                      : [
                          { key: "etatsFinanciers", label: "États financiers 3 ans" },
                          { key: "rccm",            label: "RCCM & Statuts" },
                          { key: "businessPlan",    label: "Business plan" },
                          { key: "mobileMoney",     label: "Relevés bancaires" },
                          { key: "statuts",         label: "Statuts société" },
                        ]
                    ).map((doc) => {
                      const provided = docs[doc.key];
                      return (
                        <div key={doc.key} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-4 w-4 rounded-full border ${
                                provided ? "border-green-500 bg-green-500" : "border-gray-300"
                              }`}
                            />
                            <span className={provided ? "text-gray-900" : "text-gray-400"}>
                              {doc.label}
                            </span>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              provided ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-400"
                            }`}
                          >
                            {provided ? "Fourni" : "Non fourni"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Avertissement */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-800">⚠️ Dernière vérification</p>
                  <p className="mt-1 text-xs text-amber-700">
                    En soumettant, votre dossier passera en statut{" "}
                    <strong>En révision</strong>. L'équipe LeFinancier l'analysera et vous
                    contactera si des compléments sont nécessaires.
                  </p>
                </div>
              </div>
            )}

            {/* ── Navigation ─────────────────────────────────────────────────── */}
            <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-5">
              <button
                onClick={step === 0 ? () => router.push("/dashboard/nouvelle-demande") : handlePrev}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← {step === 0 ? "Changer de produit" : step === 3 ? "Modifier les documents" : "Précédent"}
              </button>

              {step < STEPS.length - 1 && (
                <button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  Suivant →
                </button>
              )}
            </div>
          </div>

          {/* ── Panneau latéral ────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* ÉTAPE 1 — Conseils FACTURE */}
            {step === 1 && categoryUpper === "FACTURE" && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="mb-3 text-xs font-semibold text-blue-800">ℹ Conseils — Affacturage</p>
                <ul className="space-y-2 text-xs text-blue-700">
                  <li><strong>Débiteur solide :</strong> Une grande entreprise ou entité publique donne droit à une quotité d'avance plus élevée (jusqu'à 90 %).</li>
                  <li><strong>Relation longue :</strong> Plus la relation est ancienne, plus le score est élevé.</li>
                  <li><strong>Concentration :</strong> Un client qui représente + 50 % du CA augmente le risque. Diversifiez votre portefeuille client.</li>
                  <li><strong>Documents :</strong> Joindre la facture + un bon de commande double systématiquement la confiance des financeurs.</li>
                </ul>
              </div>
            )}

            {/* ÉTAPE 1 — Conseils PRET + mensualité temps réel */}
            {step === 1 && categoryUpper === "PRET" && (
              <>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="mb-3 text-xs font-semibold text-blue-800">💡 Conseils — Prêt MLT</p>
                  <ul className="space-y-2 text-xs text-blue-700">
                    <li><strong>Garantie réelle :</strong> Une hypothèque ou un dépôt cash améliore significativement votre score et réduit le taux proposé.</li>
                    <li><strong>Durée courte :</strong> Un prêt sur 12 mois est plus facile à financer qu'un prêt sur 36 mois — réduisez si possible.</li>
                    <li><strong>Objet précis :</strong> Un financement d'équipement identifiable rassure davantage qu'un besoin en fonds de roulement générique.</li>
                    <li><strong>Relevés Mobile Money :</strong> Si vous n'avez pas de bilan formel, vos relevés M-Money des 6 derniers mois sont acceptés.</li>
                  </ul>
                </div>

                {amount && durationSlider > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Mensualité estimée
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {Math.round(computeMensualite(
                        Number(amount),
                        expectedReturn ? Number(expectedReturn) : 12,
                        durationSlider,
                      )).toLocaleString("fr-FR")} FCFA
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Estimation à {expectedReturn || 12} % / an · {durationSlider} mois
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Calculée définitivement après analyse du dossier.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ÉTAPE 1 — Conseils EQUITY */}
            {step === 1 && categoryUpper === "EQUITY" && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="mb-3 text-xs font-semibold text-blue-800">ℹ Conseils — Equity</p>
                <ul className="space-y-2 text-xs text-blue-700">
                  <li><strong>TCAM :</strong> Un TCAM CA supérieur à 30 % est un signal fort pour les investisseurs.</li>
                  <li><strong>Moat :</strong> Un avantage concurrentiel fort (technologie, réseau) justifie une valorisation plus haute.</li>
                  <li><strong>Runway :</strong> Idéalement 12+ mois pour négocier sereinement sans pression de trésorerie.</li>
                </ul>
              </div>
            )}

            {/* ÉTAPE 1 — Quotité d'avance FACTURE */}
            {step === 1 && categoryUpper === "FACTURE" && (() => {
              const range = computeAdvanceRange(debiteurType);
              return (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Quotité d'avance indicative
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {range ? `${range[0]} – ${range[1]} %` : "— %"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    du montant TTC de la facture
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    Calculée définitivement après analyse du dossier complet.
                  </p>
                </div>
              );
            })()}

            {/* ÉTAPES 2 & 3 — Indice de confiance enrichi */}
            {step >= 2 && (
              <div className={`rounded-xl border p-4 ${confidence === 0 ? "border-red-200 bg-red-50" : confidence >= 75 ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${confidence === 0 ? "text-red-600" : confidence >= 75 ? "text-green-600" : "text-amber-600"}`}>
                    ⊘ Indice de confiance {step === 3 ? "" : "du dossier"}
                  </span>
                </div>
                <p className={`mt-1 text-2xl font-bold ${confidence === 0 ? "text-red-600" : confidence >= 75 ? "text-green-600" : "text-amber-600"}`}>
                  {confidence === 0 ? "Faible" : confidence >= 75 ? "Élevé" : "Moyen"}
                </p>
                <p className="text-xs text-gray-500">{confidence}/100</p>

                {step === 2 && (
                  <>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                      <span>Faible</span><span>Moyenne</span><span>Élevée</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                      <div
                        className={`h-2 rounded-full transition-all ${confidence === 0 ? "bg-red-400" : confidence >= 75 ? "bg-green-500" : "bg-amber-400"}`}
                        style={{ width: `${confidence}%` }}
                      />
                    </div>

                    {confidence < 60 && (
                      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2">
                        <p className="text-xs text-amber-700">
                          📋 Ajoutez vos relevés Mobile Money pour passer en confiance élevée.
                        </p>
                      </div>
                    )}

                    <div className="mt-3 space-y-1">
                      {(categoryUpper === "PRET" ? [
                        { key: "mobileMoney",          label: "Relevés Mobile Money",   pts: 30 },
                        { key: "etatsFinanciers",      label: "États financiers",        pts: 25 },
                        { key: "justificatifGarantie", label: "Justif. de garantie",    pts: 20 },
                        { key: "rccm",                 label: "Registre RCCM",          pts: 15 },
                        { key: "businessPlan",         label: "Business plan",           pts: 10 },
                      ] : categoryUpper === "EQUITY" ? [
                        { key: "businessPlan",    label: "Business plan / pitch",  pts: 40 },
                        { key: "etatsFinanciers", label: "États financiers",        pts: 25 },
                        { key: "statuts",         label: "Statuts société",         pts: 15 },
                        { key: "rccm",            label: "Registre RCCM",          pts: 10 },
                        { key: "mobileMoney",     label: "Relevés Mobile Money",   pts: 10 },
                      ] : [
                        { key: "facture",         label: "Facture client",          pts: 40 },
                        { key: "bonCommande",     label: "Bon de commande",         pts: 25 },
                        { key: "mobileMoney",     label: "Relevés Mobile Money",   pts: 20 },
                        { key: "etatsFinanciers", label: "États financiers",        pts: 10 },
                        { key: "rccm",            label: "Registre RCCM",          pts:  5 },
                      ]).map((d) => (
                        <div key={d.key} className="flex items-center justify-between text-xs text-gray-500">
                          <span className={docs[d.key] ? "line-through text-gray-300" : ""}>
                            ◦ {d.label}
                          </span>
                          <span className="font-medium text-gray-700">+{d.pts}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleNext}
                      className="mt-4 w-full rounded-md bg-brand-700 py-2 text-xs font-medium text-white hover:bg-brand-800"
                    >
                      Voir le résumé →
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ÉTAPE 3 — APRÈS SOUMISSION + bouton submit */}
            {step === 3 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Après soumission
                </p>
                <div className="space-y-3">
                  {[
                    { icon: "✓",  label: "Accusé de réception", delay: "Immédiat",  color: "text-green-600" },
                    { icon: "$",  label: "Analyse du dossier",   delay: "Sous 24h",  color: "text-gray-600" },
                    { icon: "📄", label: "Premières offres",     delay: categoryUpper === "PRET" ? "Sous 72h" : "Sous 48h", color: "text-gray-600" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${item.color}`}>{item.icon}</span>
                        <span className="text-gray-700">{item.label}</span>
                      </div>
                      <span className="text-gray-400">{item.delay}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-brand-700 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
                >
                  ✓ {isSubmitting ? "Envoi en cours…" : "Soumettre ma demande"}
                </button>
                <p className="mt-2 text-center text-xs text-gray-400">
                  En soumettant, vous acceptez que LeFinancier analyse et publie votre dossier auprès des financeurs.
                </p>
              </div>
            )}

            {/* ÉTAPE 2 — Formats acceptés */}
            {step === 2 && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="mb-1 text-xs font-semibold text-blue-800">ℹ FORMATS ACCEPTÉS</p>
                <p className="text-xs text-blue-700">
                  PDF, JPG, PNG, XLSX — max 10 Mo par fichier.
                </p>
                <p className="mt-2 text-xs text-blue-600">
                  Vos documents sont chiffrés et ne sont partagés avec les financeurs qu'avec votre accord explicite.
                </p>
              </div>
            )}

            {/* Montant toujours visible sauf étape 3 */}
            {amount && step < 3 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium text-gray-500">Montant demandé</p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {Number(amount).toLocaleString("fr-FR")} FCFA
                </p>
                {expectedReturn && (
                  <p className="text-xs text-gray-500">Taux : {expectedReturn} %</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
