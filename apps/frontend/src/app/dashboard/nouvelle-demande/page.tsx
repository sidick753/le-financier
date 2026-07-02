"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRODUCTS = [
  {
    id: "FACTURE",
    label: "Affacturage",
    tagline: "Avancez vos factures clients",
    badge: "Réponse rapide",
    badgeColor: "bg-blue-100 text-blue-700",
    icon: "🏷️",
    description:
      "Vous avez émis une facture et attendez le paiement ? Obtenez le montant immédiatement, sans attendre l'échéance.",
    details: [
      { icon: "⏱", label: "Durée : 30 – 180 jours" },
      { icon: "💰", label: "Montant : 500 K – 500 M FCFA" },
      { icon: "📈", label: "Taux : 5 – 9 % / an" },
    ],
    tags: ["Facture grand compte", "Facture administration", "Contrat de livraison"],
    cta: "Parcours 100 % en ligne",
    ctaColor: "text-green-600",
    borderColor: "border-brand-700",
  },
  {
    id: "PRET",
    label: "Prêt MLT",
    tagline: "Financez votre croissance",
    badge: "Flexible",
    badgeColor: "bg-purple-100 text-purple-700",
    icon: "🏛️",
    description:
      "Besoin de trésorerie, de matériel ou d'un nouveau marché ? Empruntez avec un remboursement mensuel sur mesure.",
    details: [
      { icon: "⏱", label: "Durée : 6 – 36 mois" },
      { icon: "💰", label: "Montant : 2 M – 1 Md FCFA" },
      { icon: "📈", label: "Taux : 9 – 18 % / an" },
    ],
    tags: ["Achat de matériel", "Stock / fonds de roulement", "Expansion commerciale"],
    cta: "Parcours 100 % en ligne",
    ctaColor: "text-green-600",
    borderColor: "border-gray-200",
  },
  {
    id: "EQUITY",
    label: "Equity",
    tagline: "Ouvrez votre capital",
    badge: "Sur entretien",
    badgeColor: "bg-orange-100 text-orange-700",
    icon: "📊",
    description:
      "Cédez une part de votre entreprise à des investisseurs de croissance. Pas de remboursement mensuel — vos partenaires misent sur votre succès.",
    details: [
      { icon: "⏱", label: "Horizon : 3 – 7 ans" },
      { icon: "💰", label: "Ticket : 50 M – 2 Md FCFA" },
      { icon: "👥", label: "Cession : 5 – 30 % du capital" },
    ],
    tags: ["Forte croissance", "Expansion régionale", "Transformation digitale"],
    cta: "Accompagnement personnalisé",
    ctaColor: "text-orange-600",
    borderColor: "border-gray-200",
  },
];

export default function NouvelleDemandeTypePage() {
  const [selected, setSelected] = useState<string>("FACTURE");
  const router = useRouter();

  function handleStart() {
    router.push(`/dashboard/nouvelle-demande/${selected.toLowerCase()}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Quel type de financement ?
        </h1>
        <p className="mb-8 text-sm text-gray-500">
          Sélectionnez le produit adapté à votre besoin. Le parcours suivant dépend de votre choix.
        </p>

        <div className="mb-8 grid grid-cols-3 gap-4">
          {PRODUCTS.map((product) => {
            const isSelected = selected === product.id;
            return (
              <button
                key={product.id}
                onClick={() => setSelected(product.id)}
                className={`rounded-xl border-2 p-5 text-left transition ${
                  isSelected ? product.borderColor : "border-gray-200"
                } bg-white hover:border-brand-700`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-xl">
                    {product.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${product.badgeColor}`}>
                      {product.badge}
                    </span>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-xs text-white">
                        ✓
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-base font-bold text-gray-900">{product.label}</p>
                <p className="text-xs text-gray-400">{product.tagline}</p>
                <p className="mt-2 text-xs text-gray-600">{product.description}</p>

                <div className="mt-3 space-y-1">
                  {product.details.map((d) => (
                    <p key={d.label} className="text-xs font-medium text-gray-700">
                      {d.icon} {d.label}
                    </p>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <p className={`mt-3 text-xs font-medium ${product.ctaColor}`}>
                  ⚡ {product.cta}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mb-6 rounded-xl bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-800">
            ⚡ Parcours digital en 4 étapes — environ 10 minutes.
          </p>
          <p className="mt-1 text-xs text-blue-600">
            Type & Montant → Détails → Documents → Résumé. Votre dossier sera scoré
            automatiquement et mis en ligne pour les investisseurs.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Annuler
          </button>
          <button
            onClick={handleStart}
            className="rounded-md bg-brand-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-800"
          >
            Commencer le dossier →
          </button>
        </div>
      </div>
    </div>
  );
}
