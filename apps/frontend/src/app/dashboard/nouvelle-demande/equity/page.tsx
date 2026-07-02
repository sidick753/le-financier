"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { usePmeData } from "@/lib/use-pme-data";
import { api } from "@/lib/api";

type Phase = "form" | "success";

const SECTEURS = [
  "Agriculture / Agroalimentaire",
  "Commerce de détail",
  "Construction / BTP",
  "Éducation / Formation",
  "Énergie / Environnement",
  "Finance / Fintech",
  "Santé / Pharmacie",
  "Services B2B",
  "Services B2C",
  "Technologies / Digital",
  "Transport / Logistique",
  "Autre",
];

export default function EquityPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { organization } = usePmeData();
  const [phase, setPhase] = useState<Phase>("form");

  const [dirigeant, setDirigeant] = useState("");

  useEffect(() => {
    if (organization?.legalName && !dirigeant) {
      setDirigeant(organization.legalName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization]);
  const [telephone, setTelephone] = useState("");
  const [secteur, setSecteur] = useState("");
  const [montant, setMontant] = useState("");
  const [pitch, setPitch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!dirigeant || !telephone || !montant || !pitch) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (pitch.length > 280) {
      setError("Le pitch ne doit pas dépasser 280 caractères.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      if (organization && token) {
        await api.post(
          "/funding-requests",
          {
            organizationId: organization.id,
            title: `Equity — ${dirigeant}`,
            description: pitch,
            category: "EQUITY",
            amountRequested: Number(montant),
            durationMonths: 36,
            secteurCode: secteur || undefined,
          },
          token,
        );
      }
      setPhase("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            onClick={() => router.push("/dashboard/nouvelle-demande")}
            className="hover:text-gray-700"
          >
            ← Choix du financement
          </button>
          <span>/</span>
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
            📊 Equity
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-8 py-12">
        <h1 className="text-2xl font-bold text-gray-900">
          Ouvrir votre capital — un accompagnement sur mesure
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          L'Equity n'est pas un formulaire. C'est un parcours humain en 3 étapes, piloté par un chargé d'affaires LeFinancier dédié.
        </p>

        {phase === "form" && (
          <div className="mt-8 space-y-6">
            {/* Étape 1 — active */}
            <div className="rounded-2xl border-2 border-orange-300 bg-orange-50 p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-xl">
                  📞
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">Prise de contact</h3>
                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-medium text-white">
                      Étape active
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Remplissez ce formulaire en 2 minutes. Pas de document requis à ce stade.
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Nom du dirigeant <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Jean Kouassi"
                    value={dirigeant}
                    onChange={(e) => setDirigeant(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+225 07 12 34 56 78"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Secteur d'activité
                  </label>
                  <select
                    value={secteur}
                    onChange={(e) => setSecteur(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                  >
                    <option value="">Sélectionner</option>
                    {SECTEURS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Montant recherché (FCFA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="50 000 000"
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Votre pitch en 2 lignes <span className="text-red-500">*</span>{" "}
                  <span className="font-normal text-gray-400">
                    — qu'est-ce que votre entreprise fait et pourquoi ça va grandir ?
                  </span>
                </label>
                <textarea
                  rows={4}
                  maxLength={280}
                  placeholder="Ex : KAWA Services digitise la chaîne d'approvisionnement des PME industrielles ivoiriennes. Nous avons 40 clients actifs et un pipeline de 120 PME en attente…"
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                />
                <div className="mt-1 flex justify-between text-xs text-gray-400">
                  <span>Pas de document requis à ce stade — juste votre vision.</span>
                  <span className={pitch.length > 260 ? "text-orange-500" : ""}>
                    {pitch.length}/280
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <button
                  onClick={() => router.push("/dashboard/nouvelle-demande")}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="rounded-md bg-orange-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {isSubmitting ? "Envoi en cours…" : "Demander un entretien →"}
                </button>
              </div>
            </div>

            {/* Étape 2 — verrouillée */}
            <LockedStep
              icon="💬"
              title="Entretien & due diligence"
              description="Session de 45 min (visio ou présentiel) suivie d'une analyse approfondie : modèle économique, finances, équipe, marché."
              items={[
                "Entretien stratégique (45 min)",
                "Analyse du business model",
                "Revue des états financiers",
                "Évaluation de l'équipe dirigeante",
              ]}
              lockedAfter="l'étape 1"
            />

            {/* Étape 3 — verrouillée */}
            <LockedStep
              icon="⭐"
              title="Présentation aux investisseurs"
              description="LeFinancier vous met en relation avec une sélection de fonds, business angels et banques partenaires adaptés à votre profil."
              items={[
                "Pitch deck préparé avec vous",
                "Mise en relation ciblée (fonds, BA, banques)",
                "Accompagnement à la négociation",
                "Closing et signature",
              ]}
              lockedAfter="l'étape 2"
            />
          </div>
        )}

        {/* Phase succès */}
        {phase === "success" && (
          <div className="mt-8 rounded-2xl border-2 border-green-300 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Demande envoyée !</h2>
            <p className="mt-2 text-sm text-gray-600">
              Un chargé d'affaires LeFinancier vous contactera au{" "}
              <strong>{telephone}</strong> sous 48h ouvrées pour planifier votre entretien.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: "📞", label: "Rappel", value: "Sous 48h" },
                { icon: "👤", label: "Chargé dédié", value: "Assigné" },
                { icon: "🔒", label: "Confidentialité", value: "Garantie" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-gray-200 p-3 text-center">
                  <p className="text-lg">{item.icon}</p>
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className="text-sm font-semibold text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-md bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-800"
              >
                Retour au dashboard
              </button>
              <button
                onClick={() => router.push("/dashboard/demandes")}
                className="rounded-md border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Mes demandes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LockedStep({
  icon,
  title,
  description,
  items,
  lockedAfter,
}: {
  icon: string;
  title: string;
  description: string;
  items: string[];
  lockedAfter: string;
}) {
  return (
    <div className="relative rounded-2xl border-2 border-dashed border-gray-200 p-6">
      {/* Overlay verrouillé */}
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-[1px]">
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Débloqué après {lockedAfter}
          </span>
        </div>
      </div>

      <div className="flex items-start gap-4 opacity-40">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-500">{title}</h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-400">
              À venir
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-400">{description}</p>
          <ul className="mt-2 space-y-1">
            {items.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-gray-300">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-200" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
