// ──────────────────────────────────────────────────────────────────────────────
// Barème LeFinancier v2026.1
// Fonctions pures — aucune dépendance externe
// ──────────────────────────────────────────────────────────────────────────────

export const BAREME_VERSION = '2026.1';

export interface ScoringResult {
  autoScore: number;         // 0–100, 1 décimale
  grade: string;             // A+ | A | BBB | BB | B
  gradeCapped: boolean;      // vrai si le grade a été plafonné par un facteur bloquant
  coverage: number;          // 0–1
  confidence: number;        // 0–1 — qualité / complétude des données
  advanceRate: number | null; // 0–1, FACTURE uniquement
  kpiSnapshot: Record<string, unknown>;
}

export type WeightMap = Record<string, number>;

export interface WeightCriterion {
  key: string;
  label: string;
  weight: number;
}

// Détail du calcul d'un critère, pour affichage dans le snapshot admin
// (onglet "Détail des critères").
export interface CriterionResult {
  key: string;
  label: string;
  weight: number;               // part du critère dans le score total, 0–1
  rawScore: number | null;      // 0–100, performance du critère indépendamment de son poids
  evaluable: boolean;           // false si la donnée n'a pas été fournie
  penalized: boolean;           // true si une pénalité/malus a été appliquée
  reliability: number;          // 0–1, confiance dans la donnée utilisée (proxy = plus bas)
  detail: Record<string, number | null>;
  note: string;
}

// ── Critères pondérables par produit (ordre, libellés, poids par défaut) ──────
// Ce sont ces poids par défaut qui sont utilisés tant qu'aucune configuration
// personnalisée n'a été enregistrée en base (table ScoringWeight).

export const CRITERIA_FACTURE: WeightCriterion[] = [
  { key: 'debiteurType',        label: 'Type de débiteur',                  weight: 40 },
  { key: 'debiteurSolvabilite', label: 'Solvabilité du débiteur',           weight: 20 },
  { key: 'ancienneteRelation',  label: 'Ancienneté de la relation',         weight: 15 },
  { key: 'delaiPaiement',       label: 'Délai de paiement',                 weight: 10 },
  { key: 'tauxImpaye',          label: "Taux d'impayés (12 mois)",          weight: 10 },
  { key: 'concentrationClient', label: 'Concentration du plus gros client', weight:  5 },
];

export const CRITERIA_PRET: WeightCriterion[] = [
  { key: 'capaciteRemboursement', label: 'Capacité de remboursement (DSCR)', weight: 35 },
  { key: 'structureFinanciere',   label: 'Structure financière',             weight: 25 },
  { key: 'garantie',              label: 'Garantie',                         weight: 20 },
  { key: 'profilDirigeant',       label: 'Profil du dirigeant',              weight: 10 },
  { key: 'secteur',               label: "Secteur d'activité",               weight: 10 },
];

export const CRITERIA_EQUITY: WeightCriterion[] = [
  { key: 'tractionCa',   label: "Traction du chiffre d'affaires", weight: 25 },
  { key: 'tailleMarche', label: 'Taille du marché',               weight: 20 },
  { key: 'equipe',       label: 'Équipe',                         weight: 20 },
  { key: 'scalabilite',  label: 'Scalabilité',                    weight: 15 },
  { key: 'moat',         label: 'Avantage compétitif (moat)',     weight: 10 },
  { key: 'gouvernance',  label: 'Gouvernance',                    weight: 10 },
];

export const CRITERIA_BY_PRODUCT: Record<string, WeightCriterion[]> = {
  FACTURE: CRITERIA_FACTURE,
  PRET: CRITERIA_PRET,
  EQUITY: CRITERIA_EQUITY,
};

// Recommandation associée au grade final (barème commun aux 3 moteurs).
const GRADE_ACTIONS: Record<string, string> = {
  'A+':  'Publier immédiatement',
  'A':   'Publier après validation',
  'BBB': 'Soumettre au comité crédit',
  'BB':  'Demander garanties supplémentaires',
  'B':   'Refuser',
};

function defaultWeightMap(criteria: WeightCriterion[]): WeightMap {
  return Object.fromEntries(criteria.map((c) => [c.key, c.weight]));
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

function toGrade(score: number): string {
  if (score >= 85) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 55) return 'BBB';
  if (score >= 40) return 'BB';
  return 'B';
}

function decimal(n: number, places = 1): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function buildCriterion(
  criteriaList: WeightCriterion[],
  key: string,
  w: WeightMap,
  ratio: number | null,
  opts: {
    reliability?: number;
    penalized?: boolean;
    detail?: Record<string, number | null>;
    note?: string;
    missingNote?: string;
  } = {},
): CriterionResult {
  const def = criteriaList.find((c) => c.key === key)!;
  const evaluable = ratio !== null;
  return {
    key,
    label: def.label,
    weight: decimal(w[key] / 100, 3),
    rawScore: evaluable ? decimal((ratio as number) * 100) : null,
    evaluable,
    penalized: !!opts.penalized,
    reliability: evaluable ? (opts.reliability ?? 1) : 0,
    detail: opts.detail ?? {},
    note: evaluable ? (opts.note ?? '') : (opts.missingNote ?? 'Donnée non renseignée.'),
  };
}

// ── FACTURE ───────────────────────────────────────────────────────────────────

interface FactureInput {
  debiteurType?: string | null;
  debiteurSolvabilite?: string | null;
  ancienneteRelation?: string | null;
  delaiPaiementMenu?: string | null;
  tauxImpaye12m?: number | null;
  partPlusGrosClient?: number | null;
}

// Ratios (0–1) de réalisation de chaque critère — multipliés par le poids
// configuré pour obtenir le nombre de points réellement attribués.
const DEBITEUR_TYPE_RATIO: Record<string, number> = {
  multinationale:    1,
  grande_entreprise: 0.875,
  public_solvable:   0.75,
  pme_etablie:       0.45,
  petite_structure:  0.2,
  particulier:       0.075,
};

const DEBITEUR_TYPE_CEILING: Record<string, number> = {
  multinationale:    0.90,
  grande_entreprise: 0.90,
  public_solvable:   0.85,
  pme_etablie:       0.75,
  petite_structure:  0.65,
  particulier:       0.55,
};

export function scoreFacture(input: FactureInput, weights: WeightMap = {}): ScoringResult {
  const w = { ...defaultWeightMap(CRITERIA_FACTURE), ...weights };

  let score = 0;
  let maxFilled = 0; // pour confidence

  // 1. Type débiteur
  const dtRatio = DEBITEUR_TYPE_RATIO[input.debiteurType ?? ''] ?? null;
  let dtScore: number | null = null;
  if (dtRatio !== null) { dtScore = dtRatio * w.debiteurType; score += dtScore; maxFilled += w.debiteurType; }

  // 2. Solvabilité débiteur
  const solvRatioMap: Record<string, number> = { solide: 1, neutre: 0.7, tension: 0.3, incident: 0 };
  const solvRatio = input.debiteurSolvabilite ? (solvRatioMap[input.debiteurSolvabilite] ?? null) : null;
  let solvScore: number | null = null;
  if (solvRatio !== null) { solvScore = solvRatio * w.debiteurSolvabilite; score += solvScore; maxFilled += w.debiteurSolvabilite; }

  // 3. Ancienneté relation
  const ancRatioMap: Record<string, number> = { plus_2ans: 1, '6mois_2ans': 8 / 15, premiere_transaction: 2 / 15 };
  const ancRatio = input.ancienneteRelation ? (ancRatioMap[input.ancienneteRelation] ?? null) : null;
  let ancScore: number | null = null;
  if (ancRatio !== null) { ancScore = ancRatio * w.ancienneteRelation; score += ancScore; maxFilled += w.ancienneteRelation; }

  // 4. Délai paiement
  const dpRatioMap: Record<string, number> = { a_echeance: 1, leger_retard: 0.5, souvent_retard: 0 };
  const dpRatio = input.delaiPaiementMenu ? (dpRatioMap[input.delaiPaiementMenu] ?? null) : null;
  let dpScore: number | null = null;
  if (dpRatio !== null) { dpScore = dpRatio * w.delaiPaiement; score += dpScore; maxFilled += w.delaiPaiement; }

  // 5. Taux impayés 12m
  let impRatio: number | null = null;
  let impScore: number | null = null;
  if (input.tauxImpaye12m !== undefined && input.tauxImpaye12m !== null) {
    const t = input.tauxImpaye12m; // 0–1
    impRatio = t <= 0 ? 1 : t < 0.02 ? 0.8 : t < 0.05 ? 0.5 : t < 0.10 ? 0.2 : 0;
    impScore = impRatio * w.tauxImpaye;
    score += impScore;
    maxFilled += w.tauxImpaye;
  }

  // 6. Concentration client
  let concRatio: number | null = null;
  let concScore: number | null = null;
  if (input.partPlusGrosClient !== undefined && input.partPlusGrosClient !== null) {
    const p = input.partPlusGrosClient; // 0–1
    concRatio = p < 0.20 ? 1 : p < 0.50 ? 0.6 : 0;
    concScore = concRatio * w.concentrationClient;
    score += concScore;
    maxFilled += w.concentrationClient;
  }

  const totalWeight = Object.values(w).reduce((s, v) => s + v, 0);
  const finalScore = decimal(clamp(score, 0, 100));
  const grade = toGrade(finalScore);
  const confidence = decimal(totalWeight > 0 ? maxFilled / totalWeight : 0, 3);

  // Quotité d'avance (indépendante des pondérations de score)
  const ceiling = DEBITEUR_TYPE_CEILING[input.debiteurType ?? ''] ?? 0.60;
  let advRate = ceiling;
  if (finalScore < 85) advRate = Math.max(ceiling - 0.05, 0);
  if (finalScore < 70) advRate = Math.max(ceiling - 0.15, 0);
  if (finalScore < 55) advRate = Math.max(ceiling - 0.25, 0);
  if (finalScore < 40) advRate = Math.max(ceiling - 0.35, 0);
  advRate = decimal(advRate, 3);

  const criteria: CriterionResult[] = [
    buildCriterion(CRITERIA_FACTURE, 'debiteurType', w, dtRatio, {
      missingNote: 'Type de débiteur non renseigné.',
    }),
    buildCriterion(CRITERIA_FACTURE, 'debiteurSolvabilite', w, solvRatio, {
      missingNote: 'Solvabilité du débiteur non évaluée.',
    }),
    buildCriterion(CRITERIA_FACTURE, 'ancienneteRelation', w, ancRatio, {
      missingNote: 'Ancienneté de la relation non renseignée.',
    }),
    buildCriterion(CRITERIA_FACTURE, 'delaiPaiement', w, dpRatio, {
      missingNote: 'Historique de délai de paiement non renseigné.',
    }),
    buildCriterion(CRITERIA_FACTURE, 'tauxImpaye', w, impRatio, {
      detail: input.tauxImpaye12m != null ? { tauxImpaye12mPct: decimal(input.tauxImpaye12m * 100) } : {},
      missingNote: "Taux d'impayés non renseigné.",
    }),
    buildCriterion(CRITERIA_FACTURE, 'concentrationClient', w, concRatio, {
      detail: input.partPlusGrosClient != null ? { partPlusGrosClientPct: decimal(input.partPlusGrosClient * 100) } : {},
      missingNote: 'Concentration client non renseignée.',
    }),
  ];

  return {
    autoScore:   finalScore,
    grade,
    gradeCapped: false,
    coverage:    advRate,
    confidence,
    advanceRate: advRate,
    kpiSnapshot: {
      debiteurType:     input.debiteurType,
      debiteurSolvabilite: input.debiteurSolvabilite,
      ancienneteRelation: input.ancienneteRelation,
      delaiPaiementMenu: input.delaiPaiementMenu,
      tauxImpaye12m:    input.tauxImpaye12m,
      partPlusGrosClient: input.partPlusGrosClient,
      scoreDetail: { dtScore, solvScore, ancScore, dpScore, impScore, concScore },
      weightsUsed: w,
      criteria,
      recommendation: GRADE_ACTIONS[grade] ?? null,
      missingData: criteria.filter((c) => !c.evaluable).map((c) => c.label),
    },
  };
}

// ── PRET MLT ──────────────────────────────────────────────────────────────────

interface PretInput {
  cashFlowAnnuel?: number | null;
  fluxMobileMoneyMensuel?: number | null;
  autonomieFinanciere?: number | null;
  tauxEndettement?: number | null;
  ratioLiquidite?: number | null;
  garantieType?: string | null;
  garantieCouverture?: number | null;
  dirigeantExperienceAns?: number | null;
  dirigeantAntecedents?: string | null;
  dirigeantIncidentsLegaux?: string | null;
  secteurCode?: string | null;
  secteurSaisonnalite?: boolean | null;
  secteurImportDevises?: boolean | null;
  secteurSoutienPublic?: boolean | null;
  // montant et durée pour calculer la mensualité de référence
  amountRequested?: number | null;
  durationMonths?: number | null;
}

const GARANTIE_RATIO: Record<string, number> = {
  depot_cash:            1,
  hypotheque:            0.9,
  nantissement_compte:   0.75,
  nantissement_materiel: 0.6,
  caution_personnelle:   0.4,
  caution_morale:        0.25,
  aucune:                0,
};

const SECTEUR_RATIO: Record<string, number> = {
  services_essentiels: 1,
  agro:                0.9,
  commerce_detail:     0.7,
  btp:                 0.6,
  import_export:       0.4,
  commerce_mono:       0.2,
  volatil:             0.1,
};

export function scorePret(input: PretInput, weights: WeightMap = {}): ScoringResult {
  const w = { ...defaultWeightMap(CRITERIA_PRET), ...weights };

  let score = 0;
  let capped = false;

  // — Mensualité théorique pour calcul DSCR —
  const P = input.amountRequested ?? 0;
  const n = input.durationMonths ?? 12;
  const rAnnuel = 0.15; // taux moyen PRET 15 %
  const r = rAnnuel / 12;
  const mensualite = n > 0 && P > 0
    ? (P * r) / (1 - Math.pow(1 + r, -n))
    : 0;

  // 1. Capacité de remboursement
  let remboRatio: number | null = null;
  let remboScore: number | null = null;
  let remboReliability = 1;
  let remboNote = '';
  let dscr: number | null = null;

  if (input.cashFlowAnnuel && mensualite > 0) {
    dscr = input.cashFlowAnnuel / (mensualite * 12);
    remboRatio = dscr >= 2.0 ? 1 : dscr >= 1.5 ? 0.8 : dscr >= 1.2 ? 20 / 35 : dscr >= 1.0 ? 12 / 35 : 0;
    remboReliability = 1;
    remboNote = 'Calculé sur le cash-flow annuel déclaré.';
  } else if (input.fluxMobileMoneyMensuel && mensualite > 0) {
    const ratio2 = input.fluxMobileMoneyMensuel / mensualite;
    remboRatio = ratio2 >= 3 ? 30 / 35 : ratio2 >= 2 ? 22 / 35 : ratio2 >= 1.5 ? 15 / 35 : 5 / 35;
    remboReliability = 0.6;
    remboNote = 'Estimé à partir des flux Mobile Money (proxy, fiabilité réduite).';
  }
  if (remboRatio !== null) { remboScore = remboRatio * w.capaciteRemboursement; score += remboScore; }

  // Blocage si DSCR < 1.0 (incapacité de remboursement flagrante)
  if (dscr !== null && dscr < 1.0) {
    capped = true;
  }

  // 2. Structure financière
  let structRatio: number | null = null;
  let structScore: number | null = null;
  let structReliability = 1;
  let structDetail: Record<string, number | null> = {};
  if (input.autonomieFinanciere !== undefined && input.autonomieFinanciere !== null) {
    const af = input.autonomieFinanciere;
    structRatio = af >= 0.40 ? 1 : af >= 0.20 ? 0.72 : af >= 0.10 ? 0.4 : 0.12;
    structReliability = 1;
    structDetail = { autonomieFinancierePct: decimal(af * 100) };
  } else if (input.tauxEndettement !== undefined && input.tauxEndettement !== null) {
    const te = input.tauxEndettement;
    structRatio = te <= 0.30 ? 1 : te <= 0.50 ? 0.72 : te <= 0.70 ? 0.4 : 0.12;
    structReliability = 0.7;
    structDetail = { tauxEndettementPct: decimal(te * 100) };
  }
  if (structRatio !== null) { structScore = structRatio * w.structureFinanciere; score += structScore; }

  // 3. Garantie
  let garantRatio: number | null = null;
  let garantScore: number | null = null;
  if (input.garantieType) {
    garantRatio = GARANTIE_RATIO[input.garantieType] ?? 0;
    // Bonus / malus couverture
    if (input.garantieCouverture !== undefined && input.garantieCouverture !== null) {
      if (input.garantieCouverture >= 1.5) garantRatio = Math.min(garantRatio + 0.15, 1);
      else if (input.garantieCouverture < 0.5) garantRatio = Math.max(garantRatio - 0.25, 0);
    }
    garantScore = garantRatio * w.garantie;
    score += garantScore;
  }
  const garantPenalized = input.garantieCouverture !== undefined && input.garantieCouverture !== null && input.garantieCouverture < 0.5;

  // 4. Profil dirigeant
  let dirigRatio: number | null = null;
  let dirigScore: number | null = null;
  let dirigPenalized = false;
  if (input.dirigeantExperienceAns !== undefined && input.dirigeantExperienceAns !== null) {
    const e = input.dirigeantExperienceAns;
    dirigRatio = e >= 10 ? 1 : e >= 5 ? 0.7 : e >= 2 ? 0.4 : 0.1;
    if (input.dirigeantIncidentsLegaux && input.dirigeantIncidentsLegaux !== 'aucun') {
      dirigRatio = Math.max(dirigRatio - 0.5, 0);
      dirigPenalized = true;
      capped = true;
    }
    dirigScore = dirigRatio * w.profilDirigeant;
    score += dirigScore;
  }

  // 5. Secteur
  let sectRatio: number | null = null;
  let sectScore: number | null = null;
  let sectPenalized = false;
  if (input.secteurCode) {
    sectRatio = SECTEUR_RATIO[input.secteurCode] ?? 0.5;
    if (input.secteurImportDevises) { sectRatio = Math.max(sectRatio - 0.2, 0); sectPenalized = true; }
    if (input.secteurSaisonnalite)  { sectRatio = Math.max(sectRatio - 0.1, 0); sectPenalized = true; }
    if (input.secteurSoutienPublic) sectRatio = Math.min(sectRatio + 0.1, 1);
    sectScore = sectRatio * w.secteur;
    score += sectScore;
  }

  const finalScore = decimal(clamp(score, 0, 100));
  let grade = toGrade(finalScore);
  if (capped && ['A+', 'A'].includes(grade)) grade = 'BBB';

  // Confidence : complétude des champs clés PRET
  const keyFields = [
    remboScore !== null,
    structScore !== null,
    garantScore !== null,
    dirigScore !== null,
    sectScore !== null,
  ];
  const filled = keyFields.filter(Boolean).length;
  const confidence = decimal(filled / keyFields.length, 3);

  // Coverage = garantieCouverture déclarée, 0 si absente
  const coverage = decimal(clamp(input.garantieCouverture ?? 0, 0, 5), 3);

  const criteria: CriterionResult[] = [
    buildCriterion(CRITERIA_PRET, 'capaciteRemboursement', w, remboRatio, {
      reliability: remboReliability,
      penalized: dscr !== null && dscr < 1.0,
      detail: dscr !== null
        ? { dscr: decimal(dscr, 2) }
        : (input.fluxMobileMoneyMensuel != null ? { fluxMobileMoneyMensuel: input.fluxMobileMoneyMensuel } : {}),
      note: remboNote,
      missingNote: 'Aucune donnée de capacité de remboursement fournie (cash-flow ou flux Mobile Money).',
    }),
    buildCriterion(CRITERIA_PRET, 'structureFinanciere', w, structRatio, {
      reliability: structReliability,
      detail: structDetail,
      missingNote: 'Structure financière non renseignée (autonomie financière ou taux d\'endettement).',
    }),
    buildCriterion(CRITERIA_PRET, 'garantie', w, garantRatio, {
      penalized: garantPenalized,
      detail: input.garantieCouverture != null ? { garantieCouverture: decimal(input.garantieCouverture, 2) } : {},
      missingNote: 'Aucune garantie renseignée.',
    }),
    buildCriterion(CRITERIA_PRET, 'profilDirigeant', w, dirigRatio, {
      penalized: dirigPenalized,
      detail: { dirigeantExperienceAns: input.dirigeantExperienceAns ?? null },
      note: dirigPenalized ? `Antécédents judiciaires signalés (${input.dirigeantIncidentsLegaux}) — pénalité appliquée.` : '',
      missingNote: 'Profil du dirigeant non renseigné.',
    }),
    buildCriterion(CRITERIA_PRET, 'secteur', w, sectRatio, {
      penalized: sectPenalized,
      note: sectPenalized ? 'Malus sectoriel appliqué (import en devises et/ou activité saisonnière).' : '',
      missingNote: "Secteur d'activité non renseigné.",
    }),
  ];

  return {
    autoScore:   finalScore,
    grade,
    gradeCapped: capped,
    coverage,
    confidence,
    advanceRate: null,
    kpiSnapshot: {
      amountRequested: P,
      durationMonths:  n,
      mensualiteRef:   decimal(mensualite, 0),
      dscr,
      garantieType:   input.garantieType,
      garantieCouverture: input.garantieCouverture,
      secteurCode:    input.secteurCode,
      scoreDetail:    { remboScore, structScore, garantScore, dirigScore, sectScore },
      weightsUsed: w,
      criteria,
      recommendation: GRADE_ACTIONS[grade] ?? null,
      missingData: criteria.filter((c) => !c.evaluable).map((c) => c.label),
    },
  };
}

// ── EQUITY ────────────────────────────────────────────────────────────────────

interface EquityInput {
  tcamCa3ans?: number | null;
  tailleMarche?: string | null;
  scalabilite?: string | null;
  experienceSecteurAns?: number | null;
  trackRecord?: string | null;
  completudeEquipe?: string | null;
  moat?: string | null;
  partMarcheRelative?: string | null;
  runwayMois?: number | null;
  margeBrute?: number | null;
  droitsInvestisseur?: string | null;
  transparence?: string | null;
}

export function scoreEquity(input: EquityInput, weights: WeightMap = {}): ScoringResult {
  const w = { ...defaultWeightMap(CRITERIA_EQUITY), ...weights };

  let score = 0;

  // 1. Traction CA
  let tractionRatio: number | null = null;
  let tractionScore: number | null = null;
  if (input.tcamCa3ans !== undefined && input.tcamCa3ans !== null) {
    const t = input.tcamCa3ans;
    tractionRatio = t >= 0.50 ? 1 : t >= 0.30 ? 0.8 : t >= 0.15 ? 0.56 : t >= 0 ? 0.32 : 0.08;
    tractionScore = tractionRatio * w.tractionCa;
    score += tractionScore;
  }

  // 2. Marché
  const marcheRatioMap: Record<string, number> = {
    grand_croissant: 1, niche_croissante: 0.8, grand_mature: 0.6, niche_mature: 0.35, incertain: 0.15,
  };
  let marcheRatio: number | null = null;
  let marcheScore: number | null = null;
  if (input.tailleMarche) {
    marcheRatio = marcheRatioMap[input.tailleMarche] ?? 0.25;
    marcheScore = marcheRatio * w.tailleMarche;
    score += marcheScore;
  }

  // 3. Scalabilité
  const scalRatioMap: Record<string, number> = { forte: 1, moyenne: 0.6, faible: 0.2 };
  let scalRatio: number | null = null;
  let scalScore: number | null = null;
  if (input.scalabilite) {
    scalRatio = scalRatioMap[input.scalabilite] ?? 5 / 15;
    scalScore = scalRatio * w.scalabilite;
    score += scalScore;
  }

  // 4. Équipe (moitié expérience, moitié complétude)
  let equipeRatio: number | null = null;
  let equipeScore: number | null = null;
  if (input.experienceSecteurAns !== undefined && input.experienceSecteurAns !== null) {
    const e = input.experienceSecteurAns;
    const expRatio = e >= 10 ? 1 : e >= 5 ? 0.7 : e >= 2 ? 0.4 : 0.1;
    const compRatioMap: Record<string, number> = { complete: 1, presque: 0.7, incomplete: 0.3, solo: 0 };
    const compRatio = input.completudeEquipe ? (compRatioMap[input.completudeEquipe] ?? 0.5) : 0.5;
    equipeRatio = 0.5 * expRatio + 0.5 * compRatio;
    equipeScore = equipeRatio * w.equipe;
    score += equipeScore;
  }

  // 5. Moat / compétitivité
  const moatRatioMap: Record<string, number> = { fort: 1, moderate: 0.6, faible: 0.2 };
  let moatRatio: number | null = null;
  let moatScore: number | null = null;
  if (input.moat) {
    moatRatio = moatRatioMap[input.moat] ?? 0.3;
    moatScore = moatRatio * w.moat;
    score += moatScore;
  }

  // 6. Gouvernance (moitié droits investisseur, moitié transparence)
  const droitsRatioMap: Record<string, number> = { solides: 1, standards: 0.8, limites: 0.4, absents: 0 };
  const transparenceRatioMap: Record<string, number> = { audite: 1, comptes_formels: 0.8, declaratif: 0.4, opaque: 0 };
  let gouvernanceRatio: number | null = null;
  let gouvernanceScore: number | null = null;
  if (input.droitsInvestisseur || input.transparence) {
    const d = input.droitsInvestisseur ? (droitsRatioMap[input.droitsInvestisseur] ?? 0.4) : 0.4;
    const t = input.transparence ? (transparenceRatioMap[input.transparence] ?? 0.2) : 0.2;
    gouvernanceRatio = 0.5 * d + 0.5 * t;
    gouvernanceScore = gouvernanceRatio * w.gouvernance;
    score += gouvernanceScore;
  }

  // Bonus runway (hors barème, max +3)
  if (input.runwayMois !== undefined && input.runwayMois !== null) {
    if (input.runwayMois >= 18) score += 3;
    else if (input.runwayMois >= 12) score += 1;
  }

  const finalScore = decimal(clamp(score, 0, 100));
  const grade = toGrade(finalScore);

  const keyFields = [
    tractionScore !== null,
    marcheScore !== null,
    scalScore !== null,
    equipeScore !== null,
    moatScore !== null,
    gouvernanceScore !== null,
  ];
  const filled = keyFields.filter(Boolean).length;
  const confidence = decimal(filled / keyFields.length, 3);

  const criteria: CriterionResult[] = [
    buildCriterion(CRITERIA_EQUITY, 'tractionCa', w, tractionRatio, {
      detail: input.tcamCa3ans != null ? { tcamCa3ansPct: decimal(input.tcamCa3ans * 100) } : {},
      missingNote: "Taux de croissance annuel du chiffre d'affaires non renseigné.",
    }),
    buildCriterion(CRITERIA_EQUITY, 'tailleMarche', w, marcheRatio, {
      missingNote: 'Taille de marché non renseignée.',
    }),
    buildCriterion(CRITERIA_EQUITY, 'scalabilite', w, scalRatio, {
      missingNote: 'Scalabilité non renseignée.',
    }),
    buildCriterion(CRITERIA_EQUITY, 'equipe', w, equipeRatio, {
      detail: { experienceSecteurAns: input.experienceSecteurAns ?? null },
      missingNote: "Expérience de l'équipe non renseignée.",
    }),
    buildCriterion(CRITERIA_EQUITY, 'moat', w, moatRatio, {
      missingNote: 'Avantage compétitif non renseigné.',
    }),
    buildCriterion(CRITERIA_EQUITY, 'gouvernance', w, gouvernanceRatio, {
      missingNote: 'Gouvernance non renseignée.',
    }),
  ];

  return {
    autoScore:   finalScore,
    grade,
    gradeCapped: false,
    coverage:    1.0,
    confidence,
    advanceRate: null,
    kpiSnapshot: {
      tcamCa3ans:  input.tcamCa3ans,
      tailleMarche: input.tailleMarche,
      scalabilite: input.scalabilite,
      runwayMois:  input.runwayMois,
      margeBrute:  input.margeBrute,
      scoreDetail: { tractionScore, marcheScore, scalScore, equipeScore, moatScore, gouvernanceScore },
      weightsUsed: w,
      criteria,
      recommendation: GRADE_ACTIONS[grade] ?? null,
      missingData: criteria.filter((c) => !c.evaluable).map((c) => c.label),
    },
  };
}
