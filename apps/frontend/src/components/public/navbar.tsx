"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto w-full max-w-[1460px] px-5">
        <nav className="flex h-[68px] items-center justify-between gap-5">

          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <Image src="/logo_court.png" alt="LeFinancier" width={40} height={40} className="rounded-lg" />
            <div className="hidden flex-col gap-px sm:flex">
              <span className="text-[15px] font-semibold leading-tight tracking-tight text-slate-900">Le Financier</span>
              <span className="text-[10px] font-medium leading-tight text-slate-500">Marketplace de financement</span>
            </div>
          </Link>

          {/* Nav desktop */}
          <div className="hidden items-center gap-8 text-sm font-medium text-gray-700 lg:flex">
            <Link href="/" className="hover:text-blue-700">Accueil</Link>
            <Link href="/comment-ca-marche" className="hover:text-blue-700">Comment ça marche</Link>
            <Link href="/opportunites" className="hover:text-blue-700">Opportunités</Link>
            <Link href="/tarifs" className="hover:text-blue-700">Tarifs</Link>
            <Link href="/faq" className="hover:text-blue-700">FAQ</Link>
          </div>

          {/* Actions desktop */}
          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <Link
                href="/dashboard"
                className="hidden h-10 items-center rounded-[10px] border border-gray-300 px-5 text-sm font-medium text-slate-900 transition hover:bg-gray-50 sm:inline-flex"
              >
                Tableau de bord
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden h-10 items-center rounded-[10px] border border-gray-300 px-5 text-sm font-medium text-slate-900 transition hover:bg-gray-50 sm:inline-flex"
                >
                  Connexion
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-10 items-center rounded-[10px] bg-blue-700 px-5 text-sm font-medium text-white transition hover:bg-blue-800"
                >
                  S'inscrire
                </Link>
              </>
            )}

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white text-xl lg:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? "×" : "☰"}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-gray-200 py-3 pb-4 lg:hidden">
            {[
              { href: "/", label: "Accueil" },
              { href: "/comment-ca-marche", label: "Comment ça marche" },
              { href: "/opportunites", label: "Opportunités" },
              { href: "/tarifs", label: "Tarifs" },
              { href: "/faq", label: "FAQ" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="block py-2.5 text-[15px] font-semibold text-gray-700"
              >
                {label}
              </Link>
            ))}
            <div className="mt-3 flex gap-2">
              <Link href="/login" className="flex flex-1 items-center justify-center rounded-lg border border-gray-300 py-2 text-sm font-medium text-slate-900 hover:bg-gray-50">
                Connexion
              </Link>
              <Link href="/login" className="flex flex-1 items-center justify-center rounded-lg bg-blue-700 py-2 text-sm font-medium text-white hover:bg-blue-800">
                S'inscrire
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
