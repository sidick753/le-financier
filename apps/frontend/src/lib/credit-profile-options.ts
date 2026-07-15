// Options du profil de crédit PME (secteur, santé financière, dirigeant,
// équipe/gouvernance/marché) — partagées entre le formulaire PME
// (dashboard/parametres) et la vue lecture seule admin (admin/pme/[id]),
// pour que les deux affichent exactement les mêmes libellés.

export interface CreditProfileOption {
  value: string;
  label: string;
}

export const SECTEURS: CreditProfileOption[] = [
  { value: "services_essentiels", label: "Services essentiels / Santé / Éducation" },
  { value: "agro", label: "Agriculture / Distribution alimentaire" },
  { value: "commerce_detail", label: "Commerce de détail" },
  { value: "btp", label: "BTP / Transport & Logistique" },
  { value: "import_export", label: "Import / Export" },
  { value: "commerce_mono", label: "Commerce mono / Saisonnier" },
  { value: "volatil", label: "Secteur volatil" },
];

export const TAILLE_MARCHE: CreditProfileOption[] = [
  { value: "grand_croissant", label: "Grand marché en croissance" },
  { value: "niche_croissante", label: "Niche en croissance" },
  { value: "grand_mature", label: "Grand marché mature" },
  { value: "niche_mature", label: "Niche mature" },
  { value: "incertain", label: "Incertain" },
];

export const SCALABILITE: CreditProfileOption[] = [
  { value: "forte", label: "Forte scalabilité" },
  { value: "moyenne", label: "Scalabilité moyenne" },
  { value: "faible", label: "Faible scalabilité" },
];

export const MOAT: CreditProfileOption[] = [
  { value: "fort", label: "Fort (technologie, marque, réseau)" },
  { value: "moderate", label: "Modéré" },
  { value: "faible", label: "Faible" },
];

export const PART_MARCHE: CreditProfileOption[] = [
  { value: "leader", label: "Leader" },
  { value: "challenger", label: "Challenger" },
  { value: "suiveur", label: "Suiveur" },
  { value: "marginal", label: "Marginal" },
];

export const TRACK_RECORD: CreditProfileOption[] = [
  { value: "succes_anterieur", label: "Succès entrepreneurial antérieur" },
  { value: "operationnel_solide", label: "Opérationnel solide" },
  { value: "premiere_aventure", label: "Première aventure" },
  { value: "signaux_negatifs", label: "Signaux négatifs" },
];

export const COMPLETUDE_EQUIPE: CreditProfileOption[] = [
  { value: "complete", label: "Équipe complète" },
  { value: "presque", label: "Presque complète" },
  { value: "incomplete", label: "Incomplète" },
  { value: "solo", label: "Fondateur seul" },
];

export const DROITS_INVESTISSEUR: CreditProfileOption[] = [
  { value: "solides", label: "Solides (pacte d'associés complet)" },
  { value: "standards", label: "Standards" },
  { value: "limites", label: "Limités" },
  { value: "absents", label: "Absents" },
];

export const TRANSPARENCE: CreditProfileOption[] = [
  { value: "audite", label: "Comptes audités" },
  { value: "comptes_formels", label: "Comptes formels" },
  { value: "declaratif", label: "Déclaratif" },
  { value: "opaque", label: "Opaque" },
];

export function labelFor(options: CreditProfileOption[], value: string | null | undefined): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}
