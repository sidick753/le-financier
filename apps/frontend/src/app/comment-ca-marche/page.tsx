import Link from "next/link";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";

const ICONS = {
  person: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  doc: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>
    </svg>
  ),
  shield: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  check: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  search: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  trending: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
};

const PME_STEPS = [
  { iconBg: "bg-blue-100",   icon: ICONS.person, title: "Inscription",          desc: "Créer votre compte entreprise et compléter votre profil avec documents légaux." },
  { iconBg: "bg-green-100",  icon: ICONS.doc,     title: "Publiez votre besoin", desc: "Décrivez votre besoin de financement (facture, prêt ou equity) avec tous les détails." },
  { iconBg: "bg-yellow-100", icon: ICONS.shield,  title: "Recevez des offres",   desc: "Les investisseurs intéressés vous envoient leurs propositions de financement." },
  { iconBg: "bg-green-100",  icon: ICONS.check,   title: "Acceptez & Recevez",   desc: "Choisissez la meilleure offre, signez le contrat et recevez vos fonds rapidement." },
];

const INVESTOR_STEPS = [
  { iconBg: "bg-blue-100",   icon: ICONS.person,   title: "Inscription & KYC", desc: "Créer votre compte et valider votre identité pour accéder aux opportunités." },
  { iconBg: "bg-purple-100", icon: ICONS.search,    title: "Explorez",          desc: "Parcourez les opportunités avec scoring de risque et analyse financière détaillée." },
  { iconBg: "bg-yellow-100", icon: ICONS.trending,  title: "Investissez",       desc: "Faites une offre à la PME qui correspond à votre profil de risque et objectifs." },
  { iconBg: "bg-green-100",  icon: ICONS.check,     title: "Suivez & Gagnez",   desc: "Suivez vos investissements en temps réel et recevez vos gains selon l'échéancier." },
];

const SECURITY = [
  { iconBg: "bg-blue-700",   icon: ICONS.shield,   title: "Vérification KYC",     desc: "Toutes les PME et investisseurs sont vérifiés avant d'accéder à la plateforme." },
  { iconBg: "bg-green-600",  icon: ICONS.trending, title: "Scoring Automatique",  desc: "Chaque PME reçoit un score de risque basé sur ses finances et historique." },
  { iconBg: "bg-orange-500", icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ), title: "Suivi en Temps Réel", desc: "Suivez vos demandes et investissements avec des notifications instantanées." },
];

function StepCard({ iconBg, icon, num, title, desc }: { iconBg: string; icon: React.ReactNode; num: number; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
      <div className="relative mx-auto mb-4 h-14 w-14">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${iconBg}`}>{icon}</div>
        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-900 text-[10px] font-semibold text-white">
          {num}
        </div>
      </div>
      <h3 className="mb-2 text-[15px] font-semibold text-slate-900">{title}</h3>
      <p className="text-[13px] leading-relaxed text-slate-500">{desc}</p>
    </div>
  );
}

export default function CommentCaMarchePage() {
  return (
    <>
      <Navbar />

      {/* ══ HERO ══ */}
      <section className="py-16 text-center text-white" style={{ background: "linear-gradient(120deg,#1a3fb5 0%,#1d4ed8 45%,#2563eb 100%)" }}>
        <div className="mx-auto w-full max-w-[720px] px-5">
          <h1 className="text-[clamp(26px,4vw,38px)] font-semibold tracking-[-0.03em]">Comment ça marche ?</h1>
          <p className="mt-3 text-[15px]" style={{ color: "rgba(255,255,255,0.85)" }}>
            Découvrez comment LeFinancier connecte PME et investisseurs de manière simple et sécurisée
          </p>
        </div>
      </section>

      {/* ══ POUR LES PME ══ */}
      <section className="bg-white py-16">
        <div className="mx-auto w-full max-w-[1460px] px-5">
          <div className="mb-10 text-center">
            <h2 className="text-[clamp(20px,2.6vw,28px)] font-semibold tracking-[-0.03em] text-slate-900">Pour les PME</h2>
            <p className="mt-2 text-[15px] text-slate-500">Un processus simple pour obtenir le financement dont vous avez besoin</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PME_STEPS.map((step, i) => (
              <StepCard key={step.title} num={i + 1} {...step} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ POUR LES INVESTISSEURS ══ */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto w-full max-w-[1460px] px-5">
          <div className="mb-10 text-center">
            <h2 className="text-[clamp(20px,2.6vw,28px)] font-semibold tracking-[-0.03em] text-slate-900">Pour les Investisseurs</h2>
            <p className="mt-2 text-[15px] text-slate-500">Investissez dans des PME prometteuses avec des rendements attractifs</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {INVESTOR_STEPS.map((step, i) => (
              <StepCard key={step.title} num={i + 1} {...step} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ SÉCURITÉ ET TRANSPARENCE ══ */}
      <section className="bg-slate-100 py-16">
        <div className="mx-auto w-full max-w-[1460px] px-5">
          <div className="mb-12 text-center">
            <h2 className="text-[clamp(20px,2.6vw,28px)] font-semibold tracking-[-0.03em] text-slate-900">Sécurité et Transparence</h2>
            <p className="mt-2 text-[15px] text-slate-500">Votre confiance est notre priorité</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {SECURITY.map(({ iconBg, icon, title, desc }) => (
              <div key={title} className="px-4 text-center">
                <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${iconBg}`}>{icon}</div>
                <h3 className="mb-2 text-[15px] font-semibold text-slate-900">{title}</h3>
                <p className="text-[13px] leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="bg-blue-700 py-16 text-center text-white">
        <div className="mx-auto w-full max-w-[1460px] px-5">
          <h2 className="mb-3 text-[clamp(24px,3.5vw,32px)] font-semibold tracking-[-0.03em]">Prêt à commencer ?</h2>
          <p className="mx-auto mb-9 max-w-[460px] text-[15px]" style={{ color: "rgba(255,255,255,0.8)" }}>
            Rejoignez LeFinancier et transformez votre manière de financer ou d&apos;investir
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="inline-flex h-11 items-center rounded-[10px] bg-white px-6 text-sm font-medium text-blue-700 transition hover:bg-blue-50">
              Je suis une PME
            </Link>
            <Link href="/register" className="inline-flex h-11 items-center rounded-[10px] border px-6 text-sm font-medium text-white transition hover:bg-white/10" style={{ borderColor: "rgba(255,255,255,0.55)" }}>
              Je suis un investisseur
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
