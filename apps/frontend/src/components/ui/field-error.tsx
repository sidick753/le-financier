// Message d'erreur affiché sous un champ de formulaire — toujours coupler avec
// un état visuel (bordure rouge) sur le champ lui-même, pas seulement ce texte.
export function FieldError({ show, msg }: { show: boolean; msg: string }) {
  return show ? <p className="mt-1 text-[11px] font-semibold text-red-600">{msg}</p> : null;
}
