"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getPostAuthRedirectPath } from "@/lib/role-redirect";
import { Logo } from "@/components/logo";
import { inputAuthCls } from "@/components/ui/form-styles";
import { FieldError } from "@/components/ui/field-error";

const TEST_ACCOUNTS = [
  { role: "PME",          email: "test@lefinancier.ci",          password: "motdepasse123" },
  { role: "Investisseur", email: "investisseur@lefinancier.ci",  password: "motdepasse123" },
  { role: "Banque",       email: "banque@lefinancier.ci",        password: "motdepasse123" },
  { role: "Admin",        email: "admin@lefinancier.ci",         password: "admin123456"   },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function fillTestAccount(e: string, p: string) {
    setEmail(e);
    setPassword(p);
    setErrors({});
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();

    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = "L'email est requis.";
    if (!password) newErrors.password = "Le mot de passe est requis.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await login(email, password);
      router.push(getPostAuthRedirectPath(response.user.role));
    } catch (err) {
      // Message générique (par sécurité, on ne dit pas si c'est l'email ou le
      // mot de passe qui est incorrect) — affiché sous le champ mot de passe
      // plutôt qu'en toast, pour rester au plus près de la saisie fautive.
      const msg = err instanceof Error ? err.message : "Connexion impossible.";
      setErrors({ password: msg });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
      <div className="flex w-full max-w-115 flex-col gap-4">

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          ← Retour à l'accueil
        </Link>

        <div className="rounded-2xl bg-white px-9 pt-9 pb-8 shadow-[0_4px_24px_rgba(15,23,42,0.08)]">

          <div className="mb-6 flex justify-center">
            <Logo />
          </div>

          <h1 className="text-center text-[22px] font-extrabold tracking-tight text-slate-900">
            Connexion
          </h1>
          <p className="mt-1 mb-7 text-center text-sm text-slate-500">
            Accédez à votre espace LeFinancier
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((er) => ({ ...er, email: undefined }));
                }}
                placeholder="votre@email.com"
                className={inputAuthCls(errors.email ? false : null)}
              />
              <FieldError msg={errors.email ?? ""} show={!!errors.email} />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-gray-700">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((er) => ({ ...er, password: undefined }));
                }}
                placeholder="••••••••"
                className={inputAuthCls(errors.password ? false : null)}
              />
              <FieldError msg={errors.password ?? ""} show={!!errors.password} />
            </div>

            <div className="flex items-center justify-between pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-blue-600"
                />
                Se souvenir de moi
              </label>
              <a href="#" className="text-[13px] font-semibold text-blue-600 hover:text-blue-700">
                Mot de passe oublié ?
              </a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11.5 w-full cursor-pointer rounded-lg bg-blue-600 text-[15px] font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <p className="mb-2.5 text-xs font-medium text-slate-400">Tester avec :</p>
            <div className="flex flex-col gap-1">
              {TEST_ACCOUNTS.map(({ role, email: e, password: p }) => (
                <div key={role} className="flex items-center justify-center gap-1 text-xs">
                  <span className="font-semibold text-slate-500">{role} :</span>
                  <button
                    type="button"
                    onClick={() => fillTestAccount(e, p)}
                    className="cursor-pointer font-medium text-blue-600 transition hover:text-blue-700 hover:underline"
                  >
                    {e}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-5 text-center text-[13px] text-slate-500">
            Pas encore de compte ?{" "}
            <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
              S'inscrire
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
