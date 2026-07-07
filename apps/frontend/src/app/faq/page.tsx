"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";

type FaqItem = { q: string; a: React.ReactNode };

const GENERAL: FaqItem[] = [
  {
    q: "Qu'est-ce que LeFinancier ?",
    a: "LeFinancier est une marketplace de financement qui met en relation les PME africaines à la recherche de financement (affacturage, prêt ou levée de fonds) avec des investisseurs à la recherche d'opportunités. Chaque PME est vérifiée et reçoit un score de risque avant d'être publiée, et chaque investisseur choisit les dossiers qui correspondent à son profil de risque.",
  },
  {
    q: "Comment LeFinancier gagne de l'argent ?",
    a: "La plateforme prélève une commission de 2% sur le montant financé côté PME, et une commission de 3% sur les gains réellement perçus côté investisseur. Aucun frais d'inscription, de vérification KYC ou d'abonnement mensuel — LeFinancier n'est rémunéré que lorsque vous réussissez.",
  },
  {
    q: "Est-ce sécurisé ?",
    a: "Oui. Toutes les PME et investisseurs sont vérifiés (KYC), chaque PME reçoit un score de risque, et tous les contrats sont sécurisés juridiquement. Nous assurons également le suivi des remboursements.",
  },
];

const PME: FaqItem[] = [
  {
    q: "Quels types de financement puis-je obtenir ?",
    a: (
      <>
        Vous pouvez demander :
        <br />• <strong>Affacturage</strong> : avance sur vos factures clients, de 500 K à 500 M FCFA, sur 30 à 180 jours (taux 5–9%/an)
        <br />• <strong>Prêt MLT</strong> : financement de matériel, stock ou expansion, de 2 M à 1 Md FCFA, sur 6 à 36 mois (taux 9–18%/an)
        <br />• <strong>Equity</strong> : levée de fonds en échange d'une participation au capital, ticket de 50 M à 2 Md FCFA (cession de 5 à 30% du capital)
      </>
    ),
  },
  {
    q: "Quels documents dois-je fournir ?",
    a: "Le RCCM, les bilans des deux derniers exercices, la carte CNI du dirigeant, l'attestation fiscale de l'année en cours et un plan de trésorerie. Un business plan et des états financiers détaillés sont recommandés mais optionnels pour accélérer l'étude de votre dossier. Formats acceptés : PDF, JPG, PNG, XLSX (10 Mo max par fichier).",
  },
  {
    q: "Combien de temps pour obtenir les fonds ?",
    a: "Votre dossier est analysé sous 24h après soumission. Vous recevez ensuite vos premières offres d'investisseurs sous 48h (72h pour un Prêt MLT). Les fonds sont versés dès que vous acceptez une offre et signez le contrat.",
  },
  {
    q: "Puis-je refuser une offre ?",
    a: "Oui. Vous n'êtes jamais obligé d'accepter une offre : vous pouvez négocier le taux proposé via une contre-offre, ou simplement attendre une autre proposition. Rien n'est engagé tant que vous n'avez pas accepté et signé le contrat définitif.",
  },
  {
    q: "Quel est le montant minimum/maximum ?",
    a: "Cela dépend du produit : de 500 000 à 500 000 000 FCFA pour l'affacturage, de 2 000 000 FCFA à 1 milliard FCFA pour un Prêt MLT, et un ticket de 50 millions à 2 milliards FCFA pour l'equity.",
  },
];

const INVESTORS: FaqItem[] = [
  {
    q: "Quel est le rendement moyen ?",
    a: "Il n'y a pas de taux fixe : le rendement dépend du produit et du dossier financé. À titre indicatif, les dossiers d'affacturage affichent un taux de 5 à 9%/an et les prêts de 9 à 18%/an. Une commission de 3% est prélevée uniquement sur les gains effectivement perçus.",
  },
  {
    q: "Comment évalue-t-on le risque ?",
    a: "Chaque dossier reçoit un score de risque (A+, A, BBB, BB ou B) calculé selon le produit : pour l'affacturage, la solvabilité du débiteur, l'ancienneté de la relation commerciale et le taux d'impayés sur 12 mois ; pour un prêt, les flux de trésorerie, l'endettement, la liquidité, les garanties et l'expérience du dirigeant ; pour l'equity, la croissance du chiffre d'affaires, la taille du marché, l'équipe et la marge brute.",
  },
  {
    q: "Quel est l'investissement minimum ?",
    a: "Il n'y a pas de ticket minimum imposé par la plateforme : vous investissez le montant de votre choix, dans la limite du montant restant à financer sur l'opportunité choisie.",
  },
  {
    q: "Puis-je retirer mon argent avant l'échéance ?",
    a: "Les fonds investis sont engagés jusqu'à l'échéance prévue au contrat signé avec la PME. Le remboursement suit l'échéancier convenu (mensualités pour un prêt, échéance unique pour l'affacturage) ; il n'existe pas de retrait anticipé sur la plateforme.",
  },
  {
    q: "Que se passe-t-il en cas de défaut de paiement ?",
    a: "Toute échéance non honorée est signalée en retard sur votre tableau de bord et déclenche une procédure de recouvrement encadrée par le contrat signé. Le taux de créances douteuses de chaque dossier est suivi en continu par notre équipe risques, conformément aux seuils prudentiels BCEAO.",
  },
];

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={item.q} className="rounded-xl border border-gray-200 bg-white px-6">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-slate-900"
            >
              {item.q}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {isOpen && <div className="pb-4 text-sm leading-relaxed text-slate-500">{item.a}</div>}
          </div>
        );
      })}
    </div>
  );
}

export default function FaqPage() {
  return (
    <>
      <Navbar />

      {/* ══ HERO ══ */}
      <section
        className="py-16 text-center text-white"
        style={{ background: "linear-gradient(120deg,#1a3fb5 0%,#1d4ed8 45%,#2563eb 100%)" }}
      >
        <div className="mx-auto w-full max-w-[720px] px-5">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/60">
            <span className="text-2xl font-semibold">?</span>
          </div>
          <h1 className="text-[clamp(26px,4vw,38px)] font-semibold tracking-[-0.03em]">Questions Fréquentes</h1>
          <p className="mt-3 text-[15px]" style={{ color: "rgba(255,255,255,0.85)" }}>
            Trouvez rapidement les réponses à vos questions
          </p>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto w-full max-w-[820px] px-5">
          <div className="mb-12">
            <h2 className="mb-6 text-2xl font-bold text-slate-900">Questions Générales</h2>
            <FaqAccordion items={GENERAL} />
          </div>

          <div className="mb-12">
            <h2 className="mb-6 text-2xl font-bold text-slate-900">Pour les PME</h2>
            <FaqAccordion items={PME} />
          </div>

          <div className="mb-12">
            <h2 className="mb-6 text-2xl font-bold text-slate-900">Pour les Investisseurs</h2>
            <FaqAccordion items={INVESTORS} />
          </div>

          {/* ══ CTA ══ */}
          <div className="rounded-xl border-2 border-blue-700 bg-gradient-to-br from-blue-50 to-white p-8 text-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-4 h-12 w-12 text-blue-700"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <h3 className="mb-2 text-xl font-bold text-slate-900">Vous ne trouvez pas votre réponse ?</h3>
            <p className="mb-6 text-slate-500">Notre équipe support est là pour vous aider</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="mailto:support@lefinancier.com"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-medium text-white transition hover:bg-blue-900"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                Contacter le support
              </a>
              <Link
                href="/login"
                className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-slate-900 transition hover:bg-gray-50"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
