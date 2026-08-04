export const INPUT_GRAY =
  "w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-brand-700 focus:outline-none";

// Variante avec bordure rouge quand le champ est en erreur — même fond gris
// que INPUT_GRAY, utilisée dans les pages Paramètres (profil, mot de passe...).
export function inputGrayCls(hasError?: boolean) {
  return hasError
    ? "w-full rounded-md border border-red-400 bg-red-50/60 px-3 py-2 text-sm text-gray-900 focus:border-red-500 focus:outline-none"
    : INPUT_GRAY;
}

export const INPUT_WHITE =
  "h-[42px] w-full rounded-[10px] border border-slate-200 px-3.5 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10";

// Variante avec bordure rouge — même fond blanc que INPUT_WHITE, utilisée dans
// les formulaires multi-étapes (ex : nouvelle demande de financement).
export function inputWhiteCls(hasError?: boolean) {
  return hasError
    ? "h-[42px] w-full rounded-[10px] border border-red-400 bg-red-50/60 px-3.5 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
    : INPUT_WHITE;
}

// Style des champs d'authentification (login/register) — trois états : valide
// (vert), invalide (rouge), neutre. `valid` à `null`/`undefined` = neutre.
export function inputAuthCls(valid?: boolean | null) {
  const base =
    "w-full h-[42px] border-[1.5px] rounded-lg px-3 text-sm text-slate-900 bg-white outline-none placeholder:text-gray-400 transition-[border-color,box-shadow]";
  if (valid === true) return `${base} border-green-500`;
  if (valid === false) return `${base} border-red-500`;
  return `${base} border-gray-200 focus:border-blue-600 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]`;
}
