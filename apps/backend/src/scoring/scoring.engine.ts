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

// ── FACTURE ───────────────────────────────────────────────────────────────────

interface FactureInput {
  debiteurType?: string | null;
  debiteurSolvabilite?: string | null;
  ancienneteRelation?: string | null;
  delaiPaiementMenu?: string | null;
  tauxImpaye12m?: number | null;
  partPlusGrosClient?: number | null;
}

const DEBITEUR_TYPE_SCORE: Record<string, number> = {
  multinationale:    40,
  grande_entreprise: 35,
  public_solvable:   30,
  pme_etablie:       18,
  petite_structure:   8,
  particulier:        3,
};

const DEBITEUR_TYPE_CEILING: Record<string, number> = {
  multinationale:    0.90,
  grande_entreprise: 0.90,
  public_solvable:   0.85,
  pme_etablie:       0.75,
  petite_structure:  0.65,
  particulier:       0.55,
};

export function scoreFacture(input: FactureInput): ScoringResult {
  let score = 0;
  let maxFilled = 0; // pour confidence

  // 1. Type débiteur (40 pts)
  const dtScore = DEBITEUR_TYPE_SCORE[input.debiteurType ?? ''] ?? null;
  if (dtScore !== null) { score += dtScore; maxFilled += 40; }

  // 2. Solvabilité débiteur (20 pts)
  const solvMap: Record<string, number> = { solide: 20, neutre: 14, tension: 6, incident: 0 };
  const solvScore = input.debiteurSolvabilite ? (solvMap[input.debiteurSolvabilite] ?? null) : null;
  if (solvScore !== null) { score += solvScore; maxFilled += 20; }

  // 3. Ancienneté relation (15 pts)
  const ancMap: Record<string, number> = { plus_2ans: 15, '6mois_2ans': 8, premiere_transaction: 2 };
  const ancScore = input.ancienneteRelation ? (ancMap[input.ancienneteRelation] ?? null) : null;
  if (ancScore !== null) { score += ancScore; maxFilled += 15; }

  // 4. Délai paiement (10 pts)
  const dpMap: Record<string, number> = { a_echeance: 10, leger_retard: 5, souvent_retard: 0 };
  const dpScore = input.delaiPaiementMenu ? (dpMap[input.delaiPaiementMenu] ?? null) : null;
  if (dpScore !== null) { score += dpScore; maxFilled += 10; }

  // 5. Taux impayés 12m (10 pts)
  let impScore: number | null = null;
  if (input.tauxImpaye12m !== undefined && input.tauxImpaye12m !== null) {
    const t = input.tauxImpaye12m; // 0–1
    impScore = t <= 0 ? 10 : t < 0.02 ? 8 : t < 0.05 ? 5 : t < 0.10 ? 2 : 0;
    score += impScore;
    maxFilled += 10;
  }

  // 6. Concentration client (5 pts)
  let concScore: number | null = null;
  if (input.partPlusGrosClient !== undefined && input.partPlusGrosClient !== null) {
    const p = input.partPlusGrosClient; // 0–1
    concScore = p < 0.20 ? 5 : p < 0.50 ? 3 : 0;
    score += concScore;
    maxFilled += 5;
  }

  const finalScore = decimal(clamp(score, 0, 100));
  const grade = toGrade(finalScore);
  const confidence = decimal(maxFilled / 100, 3);

  // Quotité d'avance
  const ceiling = DEBITEUR_TYPE_CEILING[input.debiteurType ?? ''] ?? 0.60;
  let advRate = ceiling;
  if (finalScore < 85) advRate = Math.max(ceiling - 0.05, 0);
  if (finalScore < 70) advRate = Math.max(ceiling - 0.15, 0);
  if (finalScore < 55) advRate = Math.max(ceiling - 0.25, 0);
  if (finalScore < 40) advRate = Math.max(ceiling - 0.35, 0);
  advRate = decimal(advRate, 3);

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

const GARANTIE_SCORE: Record<string, number> = {
  depot_cash:           20,
  hypotheque:           18,
  nantissement_compte:  15,
  nantissement_materiel: 12,
  caution_personnelle:   8,
  caution_morale:        5,
  aucune:                0,
};

const SECTEUR_SCORE: Record<string, number> = {
  services_essentiels: 10,
  agro:                 9,
  commerce_detail:      7,
  btp:                  6,
  import_export:        4,
  commerce_mono:        2,
  volatil:              1,
};

export function scorePret(input: PretInput): ScoringResult {
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

  // 1. Capacité de remboursement (35 pts)
  let remboScore: number | null = null;
  let dscr: number | null = null;

  if (input.cashFlowAnnuel && mensualite > 0) {
    dscr = input.cashFlowAnnuel / (mensualite * 12);
    remboScore = dscr >= 2.0 ? 35 : dscr >= 1.5 ? 28 : dscr >= 1.2 ? 20 : dscr >= 1.0 ? 12 : 0;
  } else if (input.fluxMobileMoneyMensuel && mensualite > 0) {
    const ratio = input.fluxMobileMoneyMensuel / mensualite;
    remboScore = ratio >= 3 ? 30 : ratio >= 2 ? 22 : ratio >= 1.5 ? 15 : 5;
  }
  if (remboScore !== null) score += remboScore;

  // Blocage si DSCR < 1.0 (incapacité de remboursement flagrante)
  if (dscr !== null && dscr < 1.0) {
    capped = true;
  }

  // 2. Structure financière (25 pts)
  let structScore: number | null = null;
  if (input.autonomieFinanciere !== undefined && input.autonomieFinanciere !== null) {
    const af = input.autonomieFinanciere;
    structScore = af >= 0.40 ? 25 : af >= 0.20 ? 18 : af >= 0.10 ? 10 : 3;
  } else if (input.tauxEndettement !== undefined && input.tauxEndettement !== null) {
    const te = input.tauxEndettement;
    structScore = te <= 0.30 ? 25 : te <= 0.50 ? 18 : te <= 0.70 ? 10 : 3;
  }
  if (structScore !== null) score += structScore;

  // 3. Garantie (20 pts)
  let garantScore: number | null = null;
  if (input.garantieType) {
    garantScore = GARANTIE_SCORE[input.garantieType] ?? 0;
    // Bonus / malus couverture
    if (input.garantieCouverture !== undefined && input.garantieCouverture !== null) {
      if (input.garantieCouverture >= 1.5) garantScore = Math.min(garantScore + 3, 20);
      else if (input.garantieCouverture < 0.5) garantScore = Math.max(garantScore - 5, 0);
    }
    score += garantScore;
  }

  // 4. Profil dirigeant (10 pts)
  let dirigScore: number | null = null;
  if (input.dirigeantExperienceAns !== undefined && input.dirigeantExperienceAns !== null) {
    const e = input.dirigeantExperienceAns;
    dirigScore = e >= 10 ? 10 : e >= 5 ? 7 : e >= 2 ? 4 : 1;
    if (input.dirigeantIncidentsLegaux && input.dirigeantIncidentsLegaux !== 'aucun') {
      dirigScore = Math.max(dirigScore - 5, 0);
      capped = true;
    }
    score += dirigScore;
  }

  // 5. Secteur (10 pts)
  let sectScore: number | null = null;
  if (input.secteurCode) {
    sectScore = SECTEUR_SCORE[input.secteurCode] ?? 5;
    if (input.secteurImportDevises) sectScore = Math.max(sectScore - 2, 0);
    if (input.secteurSaisonnalite)  sectScore = Math.max(sectScore - 1, 0);
    if (input.secteurSoutienPublic) sectScore = Math.min(sectScore + 1, 10);
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

export function scoreEquity(input: EquityInput): ScoringResult {
  let score = 0;

  // 1. Traction CA (25 pts)
  let tractionScore: number | null = null;
  if (input.tcamCa3ans !== undefined && input.tcamCa3ans !== null) {
    const t = input.tcamCa3ans;
    tractionScore = t >= 0.50 ? 25 : t >= 0.30 ? 20 : t >= 0.15 ? 14 : t >= 0 ? 8 : 2;
    score += tractionScore;
  }

  // 2. Marché (20 pts)
  const marcheMap: Record<string, number> = {
    grand_croissant: 20, niche_croissante: 16, grand_mature: 12, niche_mature: 7, incertain: 3,
  };
  let marcheScore: number | null = null;
  if (input.tailleMarche) {
    marcheScore = marcheMap[input.tailleMarche] ?? 5;
    score += marcheScore;
  }

  // 3. Scalabilité (15 pts)
  const scalMap: Record<string, number> = { forte: 15, moyenne: 9, faible: 3 };
  let scalScore: number | null = null;
  if (input.scalabilite) {
    scalScore = scalMap[input.scalabilite] ?? 5;
    score += scalScore;
  }

  // 4. Équipe (20 pts)
  let equipeScore: number | null = null;
  if (input.experienceSecteurAns !== undefined && input.experienceSecteurAns !== null) {
    const e = input.experienceSecteurAns;
    const expPts = e >= 10 ? 10 : e >= 5 ? 7 : e >= 2 ? 4 : 1;
    const compMap: Record<string, number> = {
      complete: 10, presque: 7, incomplete: 3, solo: 0,
    };
    const compPts = input.completudeEquipe ? (compMap[input.completudeEquipe] ?? 5) : 5;
    equipeScore = expPts + compPts;
    score += equipeScore;
  }

  // 5. Moat / compétitivité (10 pts)
  const moatMap: Record<string, number> = { fort: 10, moderate: 6, faible: 2 };
  let moatScore: number | null = null;
  if (input.moat) {
    moatScore = moatMap[input.moat] ?? 3;
    score += moatScore;
  }

  // 6. Gouvernance (10 pts)
  const droitsMap: Record<string, number> = { solides: 5, standards: 4, limites: 2, absents: 0 };
  const transparenceMap: Record<string, number> = { audite: 5, comptes_formels: 4, declaratif: 2, opaque: 0 };
  let gouvernanceScore: number | null = null;
  if (input.droitsInvestisseur || input.transparence) {
    const d = input.droitsInvestisseur ? (droitsMap[input.droitsInvestisseur] ?? 2) : 2;
    const t = input.transparence ? (transparenceMap[input.transparence] ?? 1) : 1;
    gouvernanceScore = d + t;
    score += gouvernanceScore;
  }

  // Bonus runway (hors barème, max +5)
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
    },
  };
}
