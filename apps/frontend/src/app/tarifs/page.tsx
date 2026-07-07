import Link from "next/link";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";

const PME_FEE_RATE = "2%";
const INVESTOR_FEE_RATE = "3%";

const PME_FEATURES = [
  "Publication illimitée de demandes",
  "Vérification et scoring gratuits",
  "Gestion de contrats sécurisées",
  "Suivi des remboursements",
  "Support client dédié",
  "Dashboard analytics",
];

const INVESTOR_FEATURES = [
  "Accès à toutes les opportunités",
  "Scoring et analyse de risque",
  "Diversification de portefeuille",
  "Suivi en temps réel",
  "Versements automatiques",
  "Rapports de performance",
];

const NO_FEES = [
  { value: "0 FCFA", label: "Inscription" },
  { value: "0 FCFA", label: "Vérification KYC" },
  { value: "0 FCFA", label: "Abonnement mensuel" },
];

const FAQ = [
  {
    q: "Quand la commission est-elle prélevée ?",
    a: "Pour les PME : au moment du financement obtenu. Pour les investisseurs : uniquement sur les intérêts effectivement perçus.",
  },
  {
    q: "Y a-t-il des frais supplémentaires ?",
    a: "Non. Aucun frais caché. La seule commission est celle mentionnée ci-dessus.",
  },
  {
    q: "Puis-je annuler mon compte ?",
    a: "Oui, à tout moment. Si vous n'avez pas de financement ou investissement en cours, la fermeture est immédiate et gratuite.",
  },
];

export default function TarifsPage() {
  return (
    <>
      <Navbar />

      {/* ══ HERO ══ */}
      <section
        className="py-[72px] text-center text-white"
        style={{ background: "linear-gradient(120deg,#1a3fb5 0%,#1d4ed8 45%,#2563eb 100%)" }}
      >
        <div className="mx-auto w-full max-w-[1460px] px-5">
          <h1 className="text-[clamp(28px,4vw,40px)] font-semibold tracking-[-0.03em]">
            Tarification Simple et Transparente
          </h1>
          <p className="mt-3 text-base" style={{ color: "rgba(255,255,255,0.82)" }}>
            Des frais compétitifs pour PME et investisseurs
          </p>
        </div>
      </section>

      {/* ══ CARTES TARIFS ══ */}
      <section className="bg-slate-100 py-[72px]">
        <div className="mx-auto grid w-full max-w-[1000px] gap-6 px-5 sm:grid-cols-2">

          {/* PME */}
          <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-700">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <h2 className="text-center text-lg font-semibold text-slate-900">Pour les PME</h2>
            <p className="mt-1 text-center text-sm text-slate-500">Publiez vos besoins de financement</p>

            <div className="mt-6 text-center">
              <div className="text-[40px] font-bold leading-none tracking-[-0.03em] text-blue-700">{PME_FEE_RATE}</div>
              <div className="mt-2 text-sm text-slate-500">Commission sur montant financé</div>
            </div>

            <ul className="mt-6 flex flex-col gap-2.5">
              {PME_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="text-blue-700">✓</span> {f}
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-lg bg-blue-50 px-4 py-3 text-[13px] text-slate-600">
              <span className="font-semibold text-slate-900">Exemple :</span> Pour un financement de 10 000 000 FCFA, vous payez seulement 200 000 FCFA de commission.
            </div>

            <Link
              href="/register"
              className="mt-6 flex h-11 items-center justify-center rounded-[10px] bg-blue-700 text-sm font-medium text-white transition hover:bg-blue-800"
            >
              Créer mon compte PME
            </Link>
          </div>

          {/* Investisseurs */}
          <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-600">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h2 className="text-center text-lg font-semibold text-slate-900">Pour les Investisseurs</h2>
            <p className="mt-1 text-center text-sm text-slate-500">Investissez dans des PME</p>

            <div className="mt-6 text-center">
              <div className="text-[40px] font-bold leading-none tracking-[-0.03em] text-green-600">{INVESTOR_FEE_RATE}</div>
              <div className="mt-2 text-sm text-slate-500">Commission sur gains générés</div>
            </div>

            <ul className="mt-6 flex flex-col gap-2.5">
              {INVESTOR_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="text-green-600">✓</span> {f}
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-lg bg-green-50 px-4 py-3 text-[13px] text-slate-600">
              <span className="font-semibold text-slate-900">Exemple :</span> Pour un gain de 500 000 FCFA, vous payez seulement 15 000 FCFA de commission.
            </div>

            <Link
              href="/register"
              className="mt-6 flex h-11 items-center justify-center rounded-[10px] bg-green-600 text-sm font-medium text-white transition hover:bg-green-700"
            >
              Créer mon compte Investisseur
            </Link>
          </div>
        </div>
      </section>

      {/* ══ AUCUN FRAIS CACHÉ ══ */}
      <section className="bg-white py-[72px] text-center">
        <div className="mx-auto w-full max-w-[1460px] px-5">
          <h2 className="text-xl font-semibold text-slate-900">Aucun frais caché</h2>
          <p className="mt-2 text-sm text-slate-500">
            Nos tarifs sont simples et transparents. Vous ne payez que lorsque vous réussissez :
          </p>
          <div className="mx-auto mt-8 grid max-w-[700px] gap-5 sm:grid-cols-3">
            {NO_FEES.map(({ value, label }) => (
              <div key={label} className="rounded-xl border border-gray-200 px-6 py-8">
                <div className="text-2xl font-bold text-slate-900">{value}</div>
                <div className="mt-1 text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section className="bg-slate-100 py-[72px]">
        <div className="mx-auto w-full max-w-[760px] px-5">
          <h2 className="mb-8 text-center text-xl font-semibold text-slate-900">Questions fréquentes</h2>
          <div className="flex flex-col gap-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm font-semibold text-blue-700">{q}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
