import Image from "next/image";
import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0d1b2e] pt-14 text-slate-400">
      <div className="mx-auto w-full max-w-[1460px] px-5">
        <div className="grid grid-cols-1 gap-12 pb-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">

          {/* Brand */}
          <div>
            <div className="mb-1.5 flex items-center gap-2.5">
              <Image
                src="/logo_long_sans_fond.png"
                alt="LeFinancier"
                width={120}
                height={32}
                className="brightness-0 invert"
                style={{ height: 32, width: "auto" }}
              />
            </div>
            <div className="text-xs text-slate-500">Marketplace de financement</div>
            <p className="mt-2.5 max-w-[240px] text-[13px] leading-relaxed">
              La marketplace de financement pour les PME africaines
            </p>
          </div>

          {/* Produit */}
          <div>
            <h4 className="mb-4 text-[13px] font-bold text-slate-200">Produit</h4>
            <div className="flex flex-col gap-2.5">
              <Link href="/comment-ca-marche" className="text-sm text-slate-500 transition hover:text-slate-200">Comment ça marche</Link>
              <Link href="/tarifs"            className="text-sm text-slate-500 transition hover:text-slate-200">Tarifs</Link>
              <Link href="/glossaire"         className="text-sm text-slate-500 transition hover:text-slate-200">Glossaire</Link>
              <Link href="/faq"               className="text-sm text-slate-500 transition hover:text-slate-200">FAQ</Link>
            </div>
          </div>

          {/* Entreprise */}
          <div>
            <h4 className="mb-4 text-[13px] font-bold text-slate-200">Entreprise</h4>
            <div className="flex flex-col gap-2.5">
              <Link href="#" className="text-sm text-slate-500 transition hover:text-slate-200">À propos</Link>
              <Link href="#" className="text-sm text-slate-500 transition hover:text-slate-200">Équipe</Link>
              <Link href="#" className="text-sm text-slate-500 transition hover:text-slate-200">Contact</Link>
            </div>
          </div>

          {/* Légal */}
          <div>
            <h4 className="mb-4 text-[13px] font-bold text-slate-200">Légal</h4>
            <div className="flex flex-col gap-2.5">
              <Link href="#" className="text-sm text-slate-500 transition hover:text-slate-200">CGU</Link>
              <Link href="#" className="text-sm text-slate-500 transition hover:text-slate-200">Politique de confidentialité</Link>
              <Link href="#" className="text-sm text-slate-500 transition hover:text-slate-200">Mentions légales</Link>
            </div>
          </div>

        </div>

        <div className="border-t border-[#1e2d40] py-5 text-center text-[13px] text-slate-500">
          © {year} LeFinancier. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
