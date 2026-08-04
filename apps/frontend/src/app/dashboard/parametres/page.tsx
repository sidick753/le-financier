"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { usePmeData } from "@/lib/use-pme-data";
import { api } from "@/lib/api";
import { NotifBell } from "@/components/ui/notif-bell";
import { PersonalProfileSection } from "@/components/ui/personal-profile-section";
import { PasswordSecuritySection } from "@/components/ui/password-security-section";
import { INPUT_GRAY } from "@/components/ui/form-styles";
import { SelectWithOther } from "@/components/ui/select-with-other";
import {
  SECTEURS_ACTIVITE,
  SECTEURS,
  TAILLE_MARCHE,
  SCALABILITE,
  MOAT,
  PART_MARCHE,
  TRACK_RECORD,
  COMPLETUDE_EQUIPE,
  DROITS_INVESTISSEUR,
  TRANSPARENCE,
} from "@/lib/credit-profile-options";
import { alertError, alertSuccess } from "@/lib/alert";
import { formatAmountInput, parseAmountInput } from "@/lib/admin-ui";

type Tab = "profil" | "entreprise" | "bancaire" | "securite";

const TABS: { id: Tab; label: string }[] = [
  { id: "profil", label: "Mon profil" },
  { id: "entreprise", label: "Profil entreprise" },
  { id: "bancaire", label: "Informations bancaires" },
  { id: "securite", label: "Sécurité" },
];

interface CreditProfile {
  sector: string | null;
  legalForm: string | null;
  foundedYear: number | null;
  address: string | null;
  city: string | null;
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
  bankName: string | null;
  bankAccountHolder: string | null;
  bankAccountNumber: string | null;
  bankSwiftCode: string | null;
}

// Champs 0–1 en base, affichés/saisis en % dans ce formulaire.
const PERCENT_FIELDS = [
  "autonomieFinanciere", "tauxEndettement", "ratioLiquidite", "tcamCa3ans", "margeBrute",
] as const;

function toPercentString(v: string | null): string {
  if (v === null || v === undefined) return "";
  return String(Number(v) * 100);
}

function fromPercentInput(v: string): number | undefined {
  return v === "" ? undefined : Number(v) / 100;
}

export default function ParametresPage() {
  return (
    <Suspense fallback={null}>
      <ParametresPageContent />
    </Suspense>
  );
}

function ParametresPageContent() {
  const { token } = useAuth();
  const { organization, isLoading: orgLoading } = usePmeData();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<Tab>(
    TABS.some((t) => t.id === searchParams.get("tab")) ? (searchParams.get("tab") as Tab) : "profil",
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sector, setSector] = useState("");
  const [legalForm, setLegalForm] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);

  const [secteurCode, setSecteurCode] = useState("");
  const [secteurSaisonnalite, setSecteurSaisonnalite] = useState(false);
  const [secteurImportDevises, setSecteurImportDevises] = useState(false);
  const [secteurSoutienPublic, setSecteurSoutienPublic] = useState(false);

  const [cashFlowAnnuel, setCashFlowAnnuel] = useState("");
  const [fluxMobileMoneyMensuel, setFluxMobileMoneyMensuel] = useState("");
  const [autonomieFinanciere, setAutonomieFinanciere] = useState("");
  const [tauxEndettement, setTauxEndettement] = useState("");
  const [ratioLiquidite, setRatioLiquidite] = useState("");
  const [tcamCa3ans, setTcamCa3ans] = useState("");
  const [margeBrute, setMargeBrute] = useState("");
  const [runwayMois, setRunwayMois] = useState("");
  const [nbClientsActifs, setNbClientsActifs] = useState("");

  const [dirigeantExperienceAns, setDirigeantExperienceAns] = useState("");
  const [dirigeantAntecedents, setDirigeantAntecedents] = useState("");
  const [dirigeantIncidentsLegaux, setDirigeantIncidentsLegaux] = useState("aucun");
  const [experienceSecteurAns, setExperienceSecteurAns] = useState("");
  const [trackRecord, setTrackRecord] = useState("");

  const [completudeEquipe, setCompletudeEquipe] = useState("");
  const [droitsInvestisseur, setDroitsInvestisseur] = useState("");
  const [transparence, setTransparence] = useState("");
  const [tailleMarche, setTailleMarche] = useState("");
  const [scalabilite, setScalabilite] = useState("");
  const [moat, setMoat] = useState("");
  const [partMarcheRelative, setPartMarcheRelative] = useState("");

  const [bankName, setBankName] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankSwiftCode, setBankSwiftCode] = useState("");
  const [isSavingBankInfo, setIsSavingBankInfo] = useState(false);

  useEffect(() => {
    if (!token || !organization) return;
    setIsLoading(true);
    api
      .get<CreditProfile>(`/organizations/${organization.id}`, token)
      .then((p) => {
        setSector(p.sector && p.sector !== "Secteur non renseigné" ? p.sector : "");
        setLegalForm(p.legalForm ?? "");
        setFoundedYear(p.foundedYear != null ? String(p.foundedYear) : "");
        setAddress(p.address ?? "");
        setCity(p.city ?? "");
        setSecteurCode(p.secteurCode ?? "");
        setSecteurSaisonnalite(p.secteurSaisonnalite ?? false);
        setSecteurImportDevises(p.secteurImportDevises ?? false);
        setSecteurSoutienPublic(p.secteurSoutienPublic ?? false);
        setCashFlowAnnuel(p.cashFlowAnnuel ? formatAmountInput(p.cashFlowAnnuel) : "");
        setFluxMobileMoneyMensuel(p.fluxMobileMoneyMensuel ? formatAmountInput(p.fluxMobileMoneyMensuel) : "");
        setAutonomieFinanciere(toPercentString(p.autonomieFinanciere));
        setTauxEndettement(toPercentString(p.tauxEndettement));
        setRatioLiquidite(toPercentString(p.ratioLiquidite));
        setTcamCa3ans(toPercentString(p.tcamCa3ans));
        setMargeBrute(toPercentString(p.margeBrute));
        setRunwayMois(p.runwayMois != null ? String(p.runwayMois) : "");
        setNbClientsActifs(p.nbClientsActifs != null ? String(p.nbClientsActifs) : "");
        setDirigeantExperienceAns(p.dirigeantExperienceAns != null ? String(p.dirigeantExperienceAns) : "");
        setDirigeantAntecedents(p.dirigeantAntecedents ?? "");
        setDirigeantIncidentsLegaux(p.dirigeantIncidentsLegaux ?? "aucun");
        setExperienceSecteurAns(p.experienceSecteurAns != null ? String(p.experienceSecteurAns) : "");
        setTrackRecord(p.trackRecord ?? "");
        setCompletudeEquipe(p.completudeEquipe ?? "");
        setDroitsInvestisseur(p.droitsInvestisseur ?? "");
        setTransparence(p.transparence ?? "");
        setTailleMarche(p.tailleMarche ?? "");
        setScalabilite(p.scalabilite ?? "");
        setMoat(p.moat ?? "");
        setPartMarcheRelative(p.partMarcheRelative ?? "");
        setBankName(p.bankName ?? "");
        setBankAccountHolder(p.bankAccountHolder ?? organization.legalName);
        setBankAccountNumber(p.bankAccountNumber ?? "");
        setBankSwiftCode(p.bankSwiftCode ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement."))
      .finally(() => setIsLoading(false));
  }, [token, organization]);

  async function handleSaveIdentity() {
    if (!token || !organization) return;
    setIsSavingIdentity(true);
    try {
      await api.patch(
        `/organizations/${organization.id}/identity`,
        {
          sector: sector || undefined,
          legalForm: legalForm || undefined,
          foundedYear: foundedYear ? Number(foundedYear) : undefined,
          address: address || undefined,
          city: city || undefined,
        },
        token,
      );
      alertSuccess("Identité enregistrée.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setIsSavingIdentity(false);
    }
  }

  async function handleSave() {
    if (!token || !organization) return;
    setIsSaving(true);
    try {
      await api.patch(
        `/organizations/${organization.id}/credit-profile`,
        {
          secteurCode: secteurCode || undefined,
          secteurSaisonnalite,
          secteurImportDevises,
          secteurSoutienPublic,
          cashFlowAnnuel: cashFlowAnnuel ? parseAmountInput(cashFlowAnnuel) : undefined,
          fluxMobileMoneyMensuel: fluxMobileMoneyMensuel ? parseAmountInput(fluxMobileMoneyMensuel) : undefined,
          autonomieFinanciere: fromPercentInput(autonomieFinanciere),
          tauxEndettement: fromPercentInput(tauxEndettement),
          ratioLiquidite: fromPercentInput(ratioLiquidite),
          tcamCa3ans: fromPercentInput(tcamCa3ans),
          margeBrute: fromPercentInput(margeBrute),
          runwayMois: runwayMois ? Number(runwayMois) : undefined,
          nbClientsActifs: nbClientsActifs ? Number(nbClientsActifs) : undefined,
          dirigeantExperienceAns: dirigeantExperienceAns ? Number(dirigeantExperienceAns) : undefined,
          dirigeantAntecedents: dirigeantAntecedents || undefined,
          dirigeantIncidentsLegaux,
          experienceSecteurAns: experienceSecteurAns ? Number(experienceSecteurAns) : undefined,
          trackRecord: trackRecord || undefined,
          completudeEquipe: completudeEquipe || undefined,
          droitsInvestisseur: droitsInvestisseur || undefined,
          transparence: transparence || undefined,
          tailleMarche: tailleMarche || undefined,
          scalabilite: scalabilite || undefined,
          moat: moat || undefined,
          partMarcheRelative: partMarcheRelative || undefined,
        },
        token,
      );
      alertSuccess("Profil enregistré.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveBankInfo() {
    if (!token || !organization) return;
    setIsSavingBankInfo(true);
    try {
      await api.patch(
        `/organizations/${organization.id}/bank-info`,
        {
          bankName: bankName || undefined,
          bankAccountHolder: bankAccountHolder || undefined,
          bankAccountNumber: bankAccountNumber || undefined,
          bankSwiftCode: bankSwiftCode || undefined,
        },
        token,
      );
      alertSuccess("Informations bancaires enregistrées.");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setIsSavingBankInfo(false);
    }
  }

  if (orgLoading || isLoading) {
    return <div className="p-8 text-sm text-gray-400">Chargement...</div>;
  }

  if (!organization) {
    return <div className="p-8 text-sm text-gray-400">Aucune entreprise associée à votre compte.</div>;
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
        <div>
          <p className="text-[18px] font-bold tracking-tight text-slate-900">Paramètres</p>
          <p className="text-xs text-slate-500">{organization.legalName}</p>
        </div>
        <NotifBell />
      </header>

      <div className="p-8 pb-16">
        <div className="mb-6 flex gap-6 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-3 text-sm font-medium transition ${
                tab === t.id
                  ? "border-b-2 border-brand-700 text-brand-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "profil" && <PersonalProfileSection />}

        {tab === "entreprise" && (
          <div>
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Ces informations sont partagées par toutes vos demandes de financement (Prêt MLT et
                Equity) : vous ne les ressaisissez qu'une seule fois ici.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="space-y-6">
              {/* Identité de l'entreprise — jamais demandée à l'inscription, complétée ici.
                  C'est ce que l'admin voit dans la fiche PME (Forme juridique, Année de
                  création, Ville, Adresse). */}
              <section className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="mb-1 text-base font-semibold text-gray-900">Identité de l'entreprise</h2>
                <p className="mb-4 text-xs text-gray-500">
                  Visible par notre équipe lors de la vérification KYC et sur votre profil auprès des investisseurs.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Secteur d'activité</label>
                    <SelectWithOther
                      value={sector}
                      onChange={setSector}
                      options={SECTEURS_ACTIVITE}
                      otherPlaceholder="Précisez votre secteur d'activité"
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Forme juridique</label>
                    <input type="text" placeholder="Ex : SARL" value={legalForm} onChange={(e) => setLegalForm(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Année de création</label>
                    <input type="number" placeholder="Ex : 2019" value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Ville</label>
                    <input type="text" placeholder="Ex : Abidjan" value={city} onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Adresse</label>
                  <input type="text" placeholder="Ex : Rue des Jardins, Cocody" value={address} onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleSaveIdentity}
                    disabled={isSavingIdentity}
                    className="rounded-md bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
                  >
                    {isSavingIdentity ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </section>

              {/* Secteur & structure */}
              <section className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="mb-1 text-base font-semibold text-gray-900">Secteur & structure</h2>
                <p className="mb-4 text-xs text-gray-500">Utilisé par le moteur de scoring Prêt MLT.</p>

                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Secteur d'activité principal</label>
                  <SelectWithOther
                    value={secteurCode}
                    onChange={setSecteurCode}
                    options={SECTEURS}
                    otherPlaceholder="Précisez le secteur"
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={secteurSaisonnalite} onChange={(e) => setSecteurSaisonnalite(e.target.checked)} />
                    Activité saisonnière
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={secteurImportDevises} onChange={(e) => setSecteurImportDevises(e.target.checked)} />
                    Import en devises
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={secteurSoutienPublic} onChange={(e) => setSecteurSoutienPublic(e.target.checked)} />
                    Soutien public au secteur
                  </label>
                </div>
              </section>

              {/* Santé financière */}
              <section className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="mb-1 text-base font-semibold text-gray-900">Santé financière</h2>
                <p className="mb-4 text-xs text-gray-500">Utilisé par les moteurs Prêt MLT et Equity.</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Cash-flow annuel (FCFA)</label>
                    <input inputMode="numeric" placeholder="Ex : 8 000 000" value={cashFlowAnnuel} onChange={(e) => setCashFlowAnnuel(formatAmountInput(e.target.value))}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                    <p className="mt-1 text-xs text-gray-400">D'après vos états financiers, si disponibles.</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Flux Mobile Money mensuel (FCFA)</label>
                    <input inputMode="numeric" placeholder="Ex : 900 000" value={fluxMobileMoneyMensuel} onChange={(e) => setFluxMobileMoneyMensuel(formatAmountInput(e.target.value))}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                    <p className="mt-1 text-xs text-gray-400">À défaut de bilan formel — moyenne des 6 derniers mois.</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Autonomie financière (%)</label>
                    <input type="number" step="0.1" placeholder="Ex : 35" value={autonomieFinanciere} onChange={(e) => setAutonomieFinanciere(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                    <p className="mt-1 text-xs text-gray-400">Fonds propres ÷ total du bilan.</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Taux d'endettement (%)</label>
                    <input type="number" step="0.1" placeholder="Ex : 40" value={tauxEndettement} onChange={(e) => setTauxEndettement(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                    <p className="mt-1 text-xs text-gray-400">À défaut de connaître votre autonomie financière.</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Ratio de liquidité</label>
                    <input type="number" step="0.01" placeholder="Ex : 1.2" value={ratioLiquidite ? String(Number(ratioLiquidite) / 100) : ""}
                      onChange={(e) => setRatioLiquidite(e.target.value ? String(Number(e.target.value) * 100) : "")}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                    <p className="mt-1 text-xs text-gray-400">Actifs court terme ÷ passifs court terme.</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Nombre de clients actifs</label>
                    <input type="number" placeholder="Ex : 12" value={nbClientsActifs} onChange={(e) => setNbClientsActifs(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">TCAM CA sur 3 ans (%)</label>
                    <input type="number" step="0.1" placeholder="Ex : 30" value={tcamCa3ans} onChange={(e) => setTcamCa3ans(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                    <p className="mt-1 text-xs text-gray-400">Equity — taux de croissance annuel moyen.</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Marge brute (%)</label>
                    <input type="number" step="0.1" placeholder="Ex : 40" value={margeBrute} onChange={(e) => setMargeBrute(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                    <p className="mt-1 text-xs text-gray-400">Chiffre d&apos;affaires moins le coût direct de vos produits/services, en % du CA.</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Runway (mois)</label>
                    <input type="number" placeholder="Ex : 12" value={runwayMois} onChange={(e) => setRunwayMois(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                    <p className="mt-1 text-xs text-gray-400">Mois de trésorerie sans nouveau financement.</p>
                  </div>
                </div>
              </section>

              {/* Profil du dirigeant */}
              <section className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="mb-1 text-base font-semibold text-gray-900">Profil du dirigeant</h2>
                <p className="mb-4 text-xs text-gray-500">Utilisé par les moteurs Prêt MLT et Equity.</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Expérience du dirigeant (années)</label>
                    <input type="number" placeholder="Ex : 7" value={dirigeantExperienceAns} onChange={(e) => setDirigeantExperienceAns(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Incidents légaux connus</label>
                    <select value={dirigeantIncidentsLegaux} onChange={(e) => setDirigeantIncidentsLegaux(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none">
                      <option value="aucun">Aucun</option>
                      <option value="connu">Incident(s) connu(s)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Expérience sectorielle (années)</label>
                    <input type="number" placeholder="Ex : 10" value={experienceSecteurAns} onChange={(e) => setExperienceSecteurAns(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                    <p className="mt-1 text-xs text-gray-400">Equity — expérience du dirigeant dans ce secteur.</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Track record du dirigeant</label>
                    <SelectWithOther
                      value={trackRecord}
                      onChange={setTrackRecord}
                      options={TRACK_RECORD}
                      otherPlaceholder="Précisez"
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-400">Vos résultats et votre historique dans ce secteur, tels qu'un investisseur les jugerait.</p>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Antécédents du dirigeant</label>
                  <input type="text" placeholder="Notes libres sur le parcours du dirigeant" value={dirigeantAntecedents} onChange={(e) => setDirigeantAntecedents(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none" />
                </div>
              </section>

              {/* Équipe, gouvernance & marché — Equity */}
              <section className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="mb-1 text-base font-semibold text-gray-900">Équipe, gouvernance & marché</h2>
                <p className="mb-4 text-xs text-gray-500">Utilisé par le moteur de scoring Equity.</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Taille du marché</label>
                    <SelectWithOther
                      value={tailleMarche}
                      onChange={setTailleMarche}
                      options={TAILLE_MARCHE}
                      otherPlaceholder="Précisez"
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Scalabilité</label>
                    <SelectWithOther
                      value={scalabilite}
                      onChange={setScalabilite}
                      options={SCALABILITE}
                      otherPlaceholder="Précisez"
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-400">Votre capacité à générer plus de revenus sans augmenter vos coûts dans les mêmes proportions.</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Avantage concurrentiel (moat)</label>
                    <SelectWithOther
                      value={moat}
                      onChange={setMoat}
                      options={MOAT}
                      otherPlaceholder="Précisez"
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-400">Ce qui vous protège durablement de la concurrence (marque, technologie, réseau...).</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Position sur le marché</label>
                    <SelectWithOther
                      value={partMarcheRelative}
                      onChange={setPartMarcheRelative}
                      options={PART_MARCHE}
                      otherPlaceholder="Précisez"
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-400">Votre place face à vos concurrents : leader, challenger, suiveur ou marginal.</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Complétude de l'équipe</label>
                    <SelectWithOther
                      value={completudeEquipe}
                      onChange={setCompletudeEquipe}
                      options={COMPLETUDE_EQUIPE}
                      otherPlaceholder="Précisez"
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Droits investisseurs</label>
                    <SelectWithOther
                      value={droitsInvestisseur}
                      onChange={setDroitsInvestisseur}
                      options={DROITS_INVESTISSEUR}
                      otherPlaceholder="Précisez"
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-400">Ce qu'un pacte d'associés accorderait à un investisseur qui entrerait au capital.</p>
                  </div>
                </div>

                <div className="mt-4 max-w-xs">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Transparence financière</label>
                  <SelectWithOther
                    value={transparence}
                    onChange={setTransparence}
                    options={TRANSPARENCE}
                    otherPlaceholder="Précisez"
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-400">Le niveau de fiabilité de vos comptes : audités, formels, déclaratifs ou peu documentés.</p>
                </div>
              </section>

              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-md bg-brand-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
                >
                  {isSaving ? "Enregistrement…" : "Enregistrer les modifications"}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "bancaire" && (
          <div className="max-w-2xl">
            <p className="mb-4 text-sm text-gray-500">
              Ces coordonnées sont utilisées pour vous verser les fonds levés (prêts et equity), une
              fois la commission de la plateforme déduite.
            </p>

            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Coordonnées bancaires</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nom de la banque</label>
                  <input type="text" placeholder="Ex : Ecobank Côte d'Ivoire" value={bankName}
                    onChange={(e) => setBankName(e.target.value)} className={INPUT_GRAY} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Titulaire du compte</label>
                  <input type="text" placeholder={organization.legalName} value={bankAccountHolder}
                    onChange={(e) => setBankAccountHolder(e.target.value)} className={INPUT_GRAY} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Numéro de compte / IBAN</label>
                  <input type="text" placeholder="Ex : CI93 CI135 01023 00456789012 34" value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)} className={INPUT_GRAY} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Code SWIFT / BIC (optionnel)</label>
                  <input type="text" placeholder="Ex : ECOCCIAB" value={bankSwiftCode}
                    onChange={(e) => setBankSwiftCode(e.target.value)} className={INPUT_GRAY} />
                </div>
                <button
                  onClick={handleSaveBankInfo}
                  disabled={isSavingBankInfo}
                  className="rounded-md bg-brand-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
                >
                  {isSavingBankInfo ? "Enregistrement…" : "Enregistrer les modifications"}
                </button>
              </div>
            </section>
          </div>
        )}

        {tab === "securite" && <PasswordSecuritySection />}
      </div>
    </>
  );
}
