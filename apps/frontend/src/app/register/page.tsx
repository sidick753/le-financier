"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/logo";

type Role = "pme" | "investisseur" | "banque";

const BUTTON_LABELS: Record<Role, string> = {
  pme:          "Créer mon compte PME",
  investisseur: "Créer mon compte Investisseur",
  banque:       "Créer le compte Institution",
};

const EMAIL_CONFIG: Record<Role, { label: string; placeholder: string }> = {
  pme:          { label: "Email professionnel",  placeholder: "contact@entreprise.com" },
  investisseur: { label: "Email",                placeholder: "marie.diallo@email.com" },
  banque:       { label: "Email institutionnel", placeholder: "contact@banque.ci"      },
};

function inputCls(valid: boolean | null) {
  const base =
    "w-full h-[42px] border-[1.5px] rounded-lg px-3 text-sm text-slate-900 bg-white outline-none placeholder:text-gray-400 transition-[border-color,box-shadow]";
  if (valid === true)  return `${base} border-green-500`;
  if (valid === false) return `${base} border-red-500`;
  return `${base} border-gray-200 focus:border-blue-600 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]`;
}

function FieldError({ msg, show }: { msg: string; show: boolean }) {
  return show ? <p className="mt-0.5 text-[11px] font-semibold text-red-600">{msg}</p> : null;
}

function BuildingIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3" />
    </svg>
  );
}
function PersonIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={size === 15 ? 2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
function BankIcon() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V10z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
    </svg>
  );
}

export default function RegisterPage() {
  const { registerPmeOwner, registerInvestor, registerInstitution } = useAuth();
  const router = useRouter();

  const [role, setRole] = useState<Role>("pme");

  // Champs PME
  const [companyName, setCompanyName]     = useState("");
  const [rccm, setRccm]                   = useState("");
  // Champs perso (PME + investisseur)
  const [firstName, setFirstName]         = useState("");
  const [lastName, setLastName]           = useState("");
  // Champ investisseur only
  const [cniNumber, setCniNumber]         = useState("");
  // Champs banque
  const [institutionName, setInstitutionName] = useState("");
  const [bceaoNumber, setBceaoNumber]     = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  // Communs
  const [email, setEmail]                 = useState("");
  const [phone, setPhone]                 = useState("");
  const [password, setPassword]           = useState("");
  const [confirmPwd, setConfirmPwd]       = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Validation visuelle
  const [emailValid, setEmailValid]       = useState<boolean | null>(null);
  const [phoneValid, setPhoneValid]       = useState<boolean | null>(null);
  const [pwdMatch, setPwdMatch]           = useState<boolean | null>(null);
  const [errors, setErrors]               = useState<Record<string, boolean>>({});

  const [submitError, setSubmitError]     = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]   = useState(false);

  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPme          = role === "pme";
  const isInvestisseur = role === "investisseur";
  const isBanque       = role === "banque";
  const showSubTabs    = !isPme;

  function selectPrimary(r: "pme" | "investisseur") {
    setRole(r === "pme" ? "pme" : "investisseur");
  }

  function onEmailChange(val: string) {
    setEmail(val);
    setEmailValid(null);
    if (emailTimer.current) clearTimeout(emailTimer.current);
    if (!val.trim()) return;
    emailTimer.current = setTimeout(() => {
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      setEmailValid(valid);
    }, 1000);
  }

  function onPhoneChange(val: string) {
    setPhone(val);
    setPhoneValid(null);
    if (phoneTimer.current) clearTimeout(phoneTimer.current);
    if (!val.trim()) return;
    phoneTimer.current = setTimeout(() => {
      const digits = val.replace(/\D/g, "");
      setPhoneValid(digits.length >= 7 && digits.length <= 15);
    }, 1000);
  }

  function onConfirmChange(val: string) {
    setConfirmPwd(val);
    if (val.length > 0) setPwdMatch(val === password);
    else setPwdMatch(null);
  }

  function onPasswordChange(val: string) {
    setPassword(val);
    if (confirmPwd.length > 0) setPwdMatch(confirmPwd === val);
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const newErrors: Record<string, boolean> = {};

    if (isPme) {
      if (!companyName.trim()) newErrors.companyName = true;
      if (!rccm.trim())        newErrors.rccm = true;
      if (!firstName.trim())   newErrors.firstName = true;
      if (!lastName.trim())    newErrors.lastName = true;
    } else if (isInvestisseur) {
      if (!firstName.trim())   newErrors.firstName = true;
      if (!lastName.trim())    newErrors.lastName = true;
      if (!cniNumber.trim())   newErrors.cniNumber = true;
    } else {
      if (!institutionName.trim())  newErrors.institutionName = true;
      if (!bceaoNumber.trim())      newErrors.bceaoNumber = true;
      if (!responsibleName.trim())  newErrors.responsibleName = true;
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) { newErrors.email = true; setEmailValid(false); }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      newErrors.phone = true; setPhoneValid(false);
    }

    if (!password || password.length < 8) newErrors.password = true;
    if (password !== confirmPwd)          { newErrors.confirmPwd = true; setPwdMatch(false); }
    if (!acceptedTerms)          newErrors.terms = true;

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const phoneValue = phone.trim() || undefined;
      let response;
      if (isPme) {
        response = await registerPmeOwner({ email, password, firstName, lastName, phone: phoneValue });
      } else if (isInvestisseur) {
        response = await registerInvestor({ email, password, firstName, lastName, phone: phoneValue });
      } else {
        const [fn = "", ...rest] = responsibleName.trim().split(" ");
        response = await registerInstitution({ email, password, firstName: fn, lastName: rest.join(" ") || fn, phone: phoneValue });
      }
      router.push(response.user.role === "PME_OWNER" ? "/dashboard" : "/investor");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Inscription impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const emailCfg = EMAIL_CONFIG[role];

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
      <div className="flex w-full max-w-170 flex-col gap-4">

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          ← Retour à l'accueil
        </Link>

        <div className="rounded-2xl bg-white px-8 pt-8 pb-7 shadow-[0_4px_24px_rgba(15,23,42,0.08)]">

          <div className="mb-5 flex justify-center">
            <Logo />
          </div>

          <h1 className="text-center text-[20px] font-extrabold tracking-tight text-slate-900">
            Créer un compte
          </h1>
          <p className="mt-1 mb-5 text-center text-[13px] text-slate-500">
            Choisissez votre type de compte pour commencer
          </p>

          {submitError && (
            <div className="mb-4 rounded-[10px] bg-red-50 px-3.5 py-2.5 text-[13px] font-semibold text-red-700">
              {submitError}
            </div>
          )}

          {/* Onglets primaires */}
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-[10px] bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => selectPrimary("pme")}
              className={`flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition ${
                isPme
                  ? "bg-blue-600 text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)]"
                  : "bg-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <BuildingIcon />
              Je suis une PME
            </button>
            <button
              type="button"
              onClick={() => selectPrimary("investisseur")}
              className={`flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition ${
                !isPme
                  ? "bg-blue-600 text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)]"
                  : "bg-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <PersonIcon />
              Je suis investisseur
            </button>
          </div>

          {/* Sous-onglets Particulier / Banque */}
          {showSubTabs && (
            <div className="mb-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole("investisseur")}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-[10px] border-[1.5px] px-2.5 py-3.5 text-[13px] font-semibold transition ${
                  isInvestisseur
                    ? "border-blue-600 text-blue-600"
                    : "border-gray-200 text-slate-500 hover:border-gray-300"
                }`}
              >
                <span className={isInvestisseur ? "text-blue-600" : "text-gray-400"}>
                  <PersonIcon size={22} />
                </span>
                Particulier
              </button>
              <button
                type="button"
                onClick={() => setRole("banque")}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-[10px] border-[1.5px] px-2.5 py-3.5 text-[13px] font-semibold transition ${
                  isBanque
                    ? "border-blue-600 text-blue-600"
                    : "border-gray-200 text-slate-500 hover:border-gray-300"
                }`}
              >
                <span className={isBanque ? "text-blue-600" : "text-gray-400"}>
                  <BankIcon />
                </span>
                Banque / Institution
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-3">

            {/* Champs PME uniquement */}
            {isPme && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                    Nom de l'entreprise
                  </label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="SARL Kouadio & Frères"
                    className={inputCls(errors.companyName ? false : null)}
                  />
                  <FieldError msg="Le nom de l'entreprise est requis." show={!!errors.companyName} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                    Numéro RCCM
                  </label>
                  <input
                    value={rccm}
                    onChange={(e) => setRccm(e.target.value)}
                    placeholder="CI-ABJ-2023-B-12345"
                    className={inputCls(errors.rccm ? false : null)}
                  />
                  <FieldError msg="Le numéro RCCM est requis." show={!!errors.rccm} />
                </div>
              </div>
            )}

            {/* Prénom / Nom — PME et Investisseur */}
            {!isBanque && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                    {isPme ? "Prénom du dirigeant" : "Prénom"}
                  </label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Marie"
                    autoComplete="given-name"
                    className={inputCls(errors.firstName ? false : null)}
                  />
                  <FieldError msg="Le prénom est requis." show={!!errors.firstName} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                    {isPme ? "Nom du dirigeant" : "Nom"}
                  </label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Diallo"
                    autoComplete="family-name"
                    className={inputCls(errors.lastName ? false : null)}
                  />
                  <FieldError msg="Le nom est requis." show={!!errors.lastName} />
                </div>
              </div>
            )}

            {/* CNI — Investisseur uniquement */}
            {isInvestisseur && (
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                  Numéro de carte nationale d'identité
                </label>
                <input
                  value={cniNumber}
                  onChange={(e) => setCniNumber(e.target.value)}
                  placeholder="CI0012345678"
                  className={inputCls(errors.cniNumber ? false : null)}
                />
                <FieldError msg="Le numéro de CNI est requis." show={!!errors.cniNumber} />
              </div>
            )}

            {/* Champs Banque */}
            {isBanque && (
              <>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                    Nom de l'institution
                  </label>
                  <input
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="Ex: Banque Atlantique CI"
                    className={inputCls(errors.institutionName ? false : null)}
                  />
                  <FieldError msg="Le nom de l'institution est requis." show={!!errors.institutionName} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                      N° Agrément BCEAO
                    </label>
                    <input
                      value={bceaoNumber}
                      onChange={(e) => setBceaoNumber(e.target.value)}
                      placeholder="CI-B-2010-001"
                      className={inputCls(errors.bceaoNumber ? false : null)}
                    />
                    <FieldError msg="Le numéro d'agrément est requis." show={!!errors.bceaoNumber} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                      Nom du responsable
                    </label>
                    <input
                      value={responsibleName}
                      onChange={(e) => setResponsibleName(e.target.value)}
                      placeholder="Jean Kouamé"
                      className={inputCls(errors.responsibleName ? false : null)}
                    />
                    <FieldError msg="Le nom du responsable est requis." show={!!errors.responsibleName} />
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                {emailCfg.label}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder={emailCfg.placeholder}
                autoComplete="username"
                className={inputCls(errors.email ? false : emailValid)}
              />
              <FieldError msg="Adresse e-mail invalide." show={emailValid === false || !!errors.email} />
            </div>

            {/* Téléphone */}
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                Téléphone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="+225 07 00 00 00 00"
                maxLength={20}
                autoComplete="tel"
                className={inputCls(errors.phone ? false : phoneValid)}
              />
              <FieldError
                msg="Entrez un numéro valide, ex : +225 07 12 34 56 78"
                show={phoneValid === false || !!errors.phone}
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className={inputCls(errors.password ? false : null)}
              />
              <FieldError msg="Le mot de passe doit contenir au moins 8 caractères." show={!!errors.password} />
            </div>

            {/* Confirmation */}
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                required
                value={confirmPwd}
                onChange={(e) => onConfirmChange(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className={inputCls(errors.confirmPwd ? false : pwdMatch)}
              />
              <FieldError
                msg="Les mots de passe ne correspondent pas."
                show={pwdMatch === false || !!errors.confirmPwd}
              />
            </div>

            {/* CGU */}
            <div className="mt-1 flex items-start gap-2.5">
              <input
                id="terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-px h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 accent-blue-600"
              />
              <label htmlFor="terms" className="cursor-pointer text-[12px] leading-relaxed text-slate-500">
                J'accepte les{" "}
                <a href="#" className="font-semibold text-blue-600">conditions générales d'utilisation</a>
                {" "}et la{" "}
                <a href="#" className="font-semibold text-blue-600">politique de confidentialité</a>
                {" "}de LeFinancier
              </label>
            </div>
            <FieldError msg="Vous devez accepter les conditions." show={!!errors.terms} />

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11.5 w-full cursor-pointer rounded-lg bg-blue-600 text-[15px] font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Création en cours..." : BUTTON_LABELS[role]}
            </button>
          </form>

          <p className="mt-4.5 text-center text-[13px] text-slate-500">
            Vous avez déjà un compte ?{" "}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Se connecter
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
