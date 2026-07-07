import Link from "next/link";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";

const STATS = [
  { num: "245",    lbl: "PME financées"         },
  { num: "1.2Mds", lbl: "FCFA déployés"        },
  { num: "8.5%",  lbl: "Rendement moyen"        },
  { num: "98%",   lbl: "Taux de remboursement"  },
];

const STEPS = [
  {
    iconBg: "bg-blue-100",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: "1. Inscription",
    desc: "Créez votre compte PME ou Investisseur en quelques minutes. Notre processus de vérification assure la sécurité de tous.",
  },
  {
    iconBg: "bg-emerald-100",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    title: "2. Publication / Exploration",
    desc: "Les PME publient leurs besoins. Les investisseurs explorent les opportunités avec scoring et analyse détaillée.",
  },
  {
    iconBg: "bg-teal-100",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    title: "3. Financement & Suivi",
    desc: "Une fois le match réalisé, nous sécurisons le contrat et assurons le suivi des remboursements.",
  },
];

const OPPS = [
  {
    name: "KAWA Services",
    badge: "Facture",
    desc: "Financement Facture Client Premium",
    fields: [
      { lbl: "Montant",   val: "15 000 000 F CFA", green: false },
      { lbl: "Durée",     val: "45 jours",          green: false },
      { lbl: "Rendement", val: "6%",                green: true  },
    ],
    risk: { score: "72/100", label: "Moyen",  cls: "bg-yellow-100 text-yellow-600" },
  },
  {
    name: "AGRO MORONOU",
    badge: "Prêt",
    desc: "Prêt Expansion Agricole",
    fields: [
      { lbl: "Montant",   val: "8 000 000 F CFA", green: false },
      { lbl: "Durée",     val: "6 mois",          green: false },
      { lbl: "Rendement", val: "18%",             green: true  },
    ],
    risk: { score: "80/100", label: "Faible", cls: "bg-green-100 text-green-700" },
  },
  {
    name: "FRESHNI",
    badge: "Equity",
    desc: "Levée de Fonds - Série A",
    fields: [
      { lbl: "Montant", val: "20 000 000 F CFA", green: false },
      { lbl: "Durée",   val: "Long terme",       green: false },
    ],
    risk: { score: "65/100", label: "Moyen",  cls: "bg-yellow-100 text-yellow-600" },
  },
];

const FEATURES = [
  {
    iconBg: "bg-blue-700",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
      </svg>
    ),
    title: "Rendements attractifs",
    desc: "Des opportunités d'investissement avec des rendements supérieurs aux placements traditionnels",
  },
  {
    iconBg: "bg-green-600",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
      </svg>
    ),
    title: "Sécurisé et transparent",
    desc: "Vérification KYC, scoring des PME, contrats sécurisés et suivi en temps réel",
  },
  {
    iconBg: "bg-orange-500",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: "Accompagnement",
    desc: "Une équipe dédiée pour vous accompagner à chaque étape du processus",
  },
];

export default function HomePage() {
  return (
    <>
      <Navbar />

      {/* ══ HERO ══ */}
      <section
        className="py-[72px] text-white"
        style={{ background: "linear-gradient(120deg,#1a3fb5 0%,#1d4ed8 45%,#2563eb 100%)" }}
      >
        <div className="mx-auto w-full max-w-[1460px] px-5">
          <h1 className="mb-5 max-w-[70%] text-[clamp(32px,4.5vw,52px)] font-semibold leading-[1.1] tracking-[-0.03em]">
            Financez la croissance de votre entreprise
          </h1>
          <p className="mb-9 max-w-[70%] text-base leading-[1.7]" style={{ color: "rgba(255,255,255,0.82)" }}>
            LeFinancier connecte les PME en quête de financement avec des investisseurs particuliers et des institutions financières (banques, fonds). Simple, rapide, sécurisé.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex h-10 items-center rounded-[10px] bg-white px-5 text-sm font-medium text-blue-700 transition hover:bg-blue-50">
              Je suis une PME &nbsp;→
            </Link>
            <Link href="/login" className="inline-flex h-10 items-center rounded-[10px] border px-5 text-sm font-medium text-white transition hover:bg-white/10" style={{ borderColor: "rgba(255,255,255,0.55)" }}>
              Je suis investisseur &nbsp;→
            </Link>
          </div>
        </div>
      </section>

      {/* ══ STATS ══ */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto w-full max-w-[1460px] px-5">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {STATS.map(({ num, lbl }) => (
              <div key={lbl} className="px-5 py-10 text-center">
                <div className="text-[38px] font-semibold leading-none tracking-[-0.05em] text-blue-700">{num}</div>
                <div className="mt-2 text-[13px] font-medium text-slate-500">{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ COMMENT ÇA MARCHE ══ */}
      <section className="bg-white py-[72px]" id="comment-ca-marche">
        <div className="mx-auto w-full max-w-[1460px] px-5">
          <div className="mb-12 text-center">
            <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-[-0.03em] text-slate-900">Comment ça marche ?</h2>
            <p className="mt-2.5 text-[15px] text-slate-500">Un processus simple et transparent pour financer ou investir</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(({ iconBg, icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-gray-200 bg-white p-7 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                <div className={`mb-[18px] flex h-11 w-11 items-center justify-center rounded-[10px] ${iconBg}`}>{icon}</div>
                <h3 className="mb-2.5 text-base font-medium tracking-[-0.01em] text-slate-900">{title}</h3>
                <p className="text-sm leading-[1.65] text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ OPPORTUNITÉS ══ */}
      <section className="bg-white py-[72px]" id="opportunites">
        <div className="mx-auto w-full max-w-[1460px] px-5">
          <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[clamp(22px,2.8vw,30px)] font-semibold tracking-[-0.03em] text-slate-900">Opportunités du moment</h2>
              <p className="mt-1.5 text-sm text-slate-500">Découvrez les projets en cours de financement</p>
            </div>
            <Link href="/opportunites" className="mt-1 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-[18px] text-sm font-medium text-slate-900 transition hover:border-gray-400 hover:bg-gray-50">
              Voir toutes les opportunités &nbsp;→
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {OPPS.map(({ name, badge, desc, fields, risk }) => (
              <div key={name} className="rounded-xl border border-gray-200 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                <div className="mb-1 flex items-start justify-between gap-2.5">
                  <span className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">{name}</span>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-medium text-blue-800">{badge}</span>
                </div>
                <div className="mb-4 text-xs text-blue-700">{desc}</div>
                {fields.map(({ lbl, val, green }) => (
                  <div key={lbl} className="flex items-center justify-between border-b border-gray-100 py-[9px] text-sm last:border-b-0">
                    <span className="font-medium text-slate-500">{lbl}</span>
                    <span className={`font-medium ${green ? "text-green-600" : "text-slate-900"}`}>{val}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-[9px] text-sm">
                  <span className="font-medium text-slate-500">Risque</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{risk.score}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${risk.cls}`}>{risk.label}</span>
                  </div>
                </div>
                <Link href="/login" className="mt-4 flex h-[42px] w-full items-center justify-center rounded-lg bg-blue-700 text-sm font-medium text-white transition hover:bg-blue-800">
                  Voir les détails
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ POURQUOI ══ */}
      <section className="bg-slate-100 py-[72px]">
        <div className="mx-auto w-full max-w-[1460px] px-5">
          <div className="mb-12 text-center">
            <h2 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-[-0.03em] text-slate-900">Pourquoi choisir LeFinancier ?</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ iconBg, icon, title, desc }) => (
              <div key={title} className="px-7 py-4 text-center">
                <div className={`mx-auto mb-[18px] flex h-16 w-16 items-center justify-center rounded-full ${iconBg}`}>{icon}</div>
                <h3 className="mb-2.5 text-base font-medium text-slate-900">{title}</h3>
                <p className="text-sm leading-[1.65] text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="bg-blue-700 py-[72px] text-center text-white">
        <div className="mx-auto w-full max-w-[1460px] px-5">
          <h2 className="mb-3 text-[clamp(24px,3.5vw,38px)] font-semibold tracking-[-0.03em]">Prêt à commencer ?</h2>
          <p className="mx-auto mb-9 max-w-[460px] text-[15px]" style={{ color: "rgba(255,255,255,0.8)" }}>
            Rejoignez des centaines de PME et investisseurs qui font confiance à LeFinancier
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="inline-flex h-12 items-center rounded-[10px] bg-white px-7 text-sm font-medium text-blue-700 transition hover:bg-blue-50">
              Créer mon compte PME
            </Link>
            <Link href="/register" className="inline-flex h-12 items-center rounded-[10px] border px-7 text-sm font-medium text-white transition hover:bg-white/10" style={{ borderColor: "rgba(255,255,255,0.55)" }}>
              Créer mon compte Investisseur
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
