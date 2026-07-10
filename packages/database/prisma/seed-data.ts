// Données brutes du seed complet — voir seed.ts pour l'orchestration.
// Les profils de crédit sont générés par palier de risque (Tier) plutôt que saisis
// champ par champ : chaque palier correspond à des plages de valeurs réalistes qui,
// une fois passées dans le vrai moteur de scoring (apps/backend/src/scoring/scoring.engine.ts),
// produisent un score cohérent avec le récit (excellent → A/A+, faible → BB/B).

export type Tier = 'excellent' | 'bon' | 'moyen' | 'faible';
export type Category = 'FACTURE' | 'PRET' | 'EQUITY';

// ── RNG déterministe (mêmes données à chaque exécution du seed) ───────────────
export function mulberry32(seed: number) {
  let a = seed;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
export function range(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}
export function rangeInt(rng: () => number, min: number, max: number): number {
  return Math.floor(range(rng, min, max + 1));
}

// ── Profil de crédit PME (Organization) — champs partagés par toutes les demandes ──

export interface CreditProfile {
  secteurCode?: string;
  secteurSaisonnalite?: boolean;
  secteurImportDevises?: boolean;
  secteurSoutienPublic?: boolean;
  cashFlowAnnuel?: number;
  fluxMobileMoneyMensuel?: number;
  autonomieFinanciere?: number;
  tauxEndettement?: number;
  ratioLiquidite?: number;
  tcamCa3ans?: number;
  margeBrute?: number;
  runwayMois?: number;
  nbClientsActifs?: number;
  dirigeantExperienceAns?: number;
  dirigeantAntecedents?: string;
  dirigeantIncidentsLegaux?: string;
  experienceSecteurAns?: number;
  trackRecord?: string;
  completudeEquipe?: string;
  droitsInvestisseur?: string;
  transparence?: string;
  tailleMarche?: string;
  scalabilite?: string;
  moat?: string;
  partMarcheRelative?: string;
}

const TRACK_RECORDS: Record<Tier, string[]> = {
  excellent: [
    "Croissance rentable depuis 4 exercices, aucun retard fournisseur.",
    "Leader régional sur son segment, contrats pluriannuels sécurisés.",
  ],
  bon: [
    "Croissance régulière, quelques tensions de trésorerie saisonnières absorbées.",
    "Deux exercices bénéficiaires consécutifs après une phase de restructuration.",
  ],
  moyen: [
    "Activité stable mais dépendante d'un nombre restreint de clients.",
    "Croissance irrégulière, un exercice déficitaire il y a 2 ans.",
  ],
  faible: [
    "Historique court, premiers exercices tout juste à l'équilibre.",
    "Activité récemment relancée après une période difficile.",
  ],
};

const PART_MARCHE: Record<Tier, string[]> = {
  excellent: ["Acteur n°1 régional sur son segment (>25% de part de marché estimée)."],
  bon: ["Acteur établi, top 3 régional sur son segment."],
  moyen: ["Acteur secondaire face à 2-3 concurrents mieux capitalisés."],
  faible: ["Position marginale, forte concurrence informelle."],
};

const DIRIGEANT_ANTECEDENTS: Record<Tier, string[]> = {
  excellent: ["Ancien cadre bancaire, 15 ans dans le secteur.", "Ex-directeur régional d'un groupe international."],
  bon: ["Entrepreneur depuis 8 ans, une précédente entreprise revendue avec succès.", "Cadre supérieur reconverti à l'entrepreneuriat."],
  moyen: ["Autodidacte, a repris l'entreprise familiale.", "Première expérience de direction générale."],
  faible: ["Jeune diplômé, première création d'entreprise.", "Reconversion récente, peu d'historique de gestion."],
};

function tierProfile(tier: Tier, sizeFactor: number, rng: () => number): CreditProfile {
  const base = 60_000_000 * sizeFactor;
  const cashFlowAnnuel = Math.round(base * range(rng, 0.9, 1.6));
  const fluxMobileMoneyMensuel = Math.round((cashFlowAnnuel / 12) * range(rng, 0.55, 0.85));
  const nbClientsActifs = rangeInt(rng, Math.round(15 * sizeFactor), Math.round(90 * sizeFactor));

  switch (tier) {
    case 'excellent':
      return {
        secteurCode: pick(rng, ['services_essentiels', 'agro']),
        secteurSaisonnalite: false,
        secteurImportDevises: false,
        secteurSoutienPublic: rng() < 0.5,
        cashFlowAnnuel,
        fluxMobileMoneyMensuel,
        autonomieFinanciere: Number(range(rng, 0.45, 0.60).toFixed(4)),
        tauxEndettement: Number(range(rng, 0.15, 0.25).toFixed(4)),
        ratioLiquidite: Number(range(rng, 1.8, 2.6).toFixed(4)),
        tcamCa3ans: Number(range(rng, 0.35, 0.70).toFixed(4)),
        margeBrute: Number(range(rng, 0.30, 0.50).toFixed(4)),
        runwayMois: rangeInt(rng, 18, 32),
        nbClientsActifs,
        dirigeantExperienceAns: rangeInt(rng, 10, 20),
        dirigeantAntecedents: pick(rng, DIRIGEANT_ANTECEDENTS.excellent),
        dirigeantIncidentsLegaux: 'aucun',
        experienceSecteurAns: rangeInt(rng, 8, 18),
        trackRecord: pick(rng, TRACK_RECORDS.excellent),
        completudeEquipe: 'complete',
        droitsInvestisseur: 'solides',
        transparence: 'audite',
        tailleMarche: pick(rng, ['grand_croissant', 'niche_croissante']),
        scalabilite: 'forte',
        moat: 'fort',
        partMarcheRelative: pick(rng, PART_MARCHE.excellent),
      };
    case 'bon':
      return {
        secteurCode: pick(rng, ['commerce_detail', 'agro']),
        secteurSaisonnalite: rng() < 0.2,
        secteurImportDevises: false,
        secteurSoutienPublic: rng() < 0.3,
        cashFlowAnnuel,
        fluxMobileMoneyMensuel,
        autonomieFinanciere: Number(range(rng, 0.25, 0.35).toFixed(4)),
        tauxEndettement: Number(range(rng, 0.30, 0.42).toFixed(4)),
        ratioLiquidite: Number(range(rng, 1.2, 1.7).toFixed(4)),
        tcamCa3ans: Number(range(rng, 0.18, 0.32).toFixed(4)),
        margeBrute: Number(range(rng, 0.20, 0.32).toFixed(4)),
        runwayMois: rangeInt(rng, 10, 17),
        nbClientsActifs,
        dirigeantExperienceAns: rangeInt(rng, 5, 9),
        dirigeantAntecedents: pick(rng, DIRIGEANT_ANTECEDENTS.bon),
        dirigeantIncidentsLegaux: 'aucun',
        experienceSecteurAns: rangeInt(rng, 5, 9),
        trackRecord: pick(rng, TRACK_RECORDS.bon),
        completudeEquipe: 'presque',
        droitsInvestisseur: 'standards',
        transparence: 'comptes_formels',
        tailleMarche: pick(rng, ['niche_croissante', 'grand_mature']),
        scalabilite: 'moyenne',
        moat: 'moderate',
        partMarcheRelative: pick(rng, PART_MARCHE.bon),
      };
    case 'moyen':
      return {
        secteurCode: pick(rng, ['btp', 'commerce_detail']),
        secteurSaisonnalite: rng() < 0.5,
        secteurImportDevises: rng() < 0.2,
        secteurSoutienPublic: rng() < 0.2,
        cashFlowAnnuel,
        fluxMobileMoneyMensuel,
        autonomieFinanciere: Number(range(rng, 0.12, 0.19).toFixed(4)),
        tauxEndettement: Number(range(rng, 0.45, 0.60).toFixed(4)),
        ratioLiquidite: Number(range(rng, 0.9, 1.2).toFixed(4)),
        tcamCa3ans: Number(range(rng, 0.05, 0.15).toFixed(4)),
        margeBrute: Number(range(rng, 0.12, 0.20).toFixed(4)),
        runwayMois: rangeInt(rng, 4, 9),
        nbClientsActifs,
        dirigeantExperienceAns: rangeInt(rng, 2, 4),
        dirigeantAntecedents: pick(rng, DIRIGEANT_ANTECEDENTS.moyen),
        dirigeantIncidentsLegaux: 'aucun',
        experienceSecteurAns: rangeInt(rng, 2, 5),
        trackRecord: pick(rng, TRACK_RECORDS.moyen),
        completudeEquipe: 'incomplete',
        droitsInvestisseur: 'limites',
        transparence: 'declaratif',
        tailleMarche: pick(rng, ['grand_mature', 'niche_mature']),
        scalabilite: 'faible',
        moat: 'faible',
        partMarcheRelative: pick(rng, PART_MARCHE.moyen),
      };
    case 'faible':
    default:
      return {
        secteurCode: pick(rng, ['import_export', 'commerce_mono', 'volatil']),
        secteurSaisonnalite: rng() < 0.5,
        secteurImportDevises: rng() < 0.6,
        secteurSoutienPublic: false,
        cashFlowAnnuel,
        fluxMobileMoneyMensuel,
        autonomieFinanciere: Number(range(rng, 0.03, 0.09).toFixed(4)),
        tauxEndettement: Number(range(rng, 0.65, 0.85).toFixed(4)),
        ratioLiquidite: Number(range(rng, 0.4, 0.8).toFixed(4)),
        tcamCa3ans: Number(range(rng, -0.05, 0.05).toFixed(4)),
        margeBrute: Number(range(rng, 0.02, 0.10).toFixed(4)),
        runwayMois: rangeInt(rng, 0, 4),
        nbClientsActifs,
        dirigeantExperienceAns: rangeInt(rng, 0, 1),
        dirigeantAntecedents: pick(rng, DIRIGEANT_ANTECEDENTS.faible),
        dirigeantIncidentsLegaux: rng() < 0.35 ? 'litige_commercial_2024' : 'aucun',
        experienceSecteurAns: rangeInt(rng, 0, 2),
        trackRecord: pick(rng, TRACK_RECORDS.faible),
        completudeEquipe: 'solo',
        droitsInvestisseur: 'absents',
        transparence: 'opaque',
        tailleMarche: pick(rng, ['incertain', 'niche_mature']),
        scalabilite: 'faible',
        moat: 'faible',
        partMarcheRelative: pick(rng, PART_MARCHE.faible),
      };
  }
}

// completude du dossier ~ complétude déclarative de la PME sur la plateforme :
// VERIFIED -> profil complet ; PENDING -> en cours de complétion ; REJECTED -> minimal.
export function buildCreditProfile(
  tier: Tier,
  sizeFactor: number,
  verification: 'VERIFIED' | 'PENDING' | 'REJECTED',
  rng: () => number,
): CreditProfile {
  const full = tierProfile(tier, sizeFactor, rng);
  if (verification === 'VERIFIED') return full;

  const keys = Object.keys(full) as (keyof CreditProfile)[];
  const keepRatio = verification === 'PENDING' ? 0.55 : 0.2;
  const partial: CreditProfile = {};
  for (const key of keys) {
    if (rng() < keepRatio) (partial as any)[key] = full[key];
  }
  return partial;
}

// ── Débiteur (FACTURE) et garantie (PRET) — champs propres à CHAQUE demande ────

export interface DebtorProfile {
  debiteurNom: string;
  debiteurType: string;
  debiteurSolvabilite: string;
  ancienneteRelation: string;
  delaiPaiementMenu: string;
  tauxImpaye12m: number;
  partPlusGrosClient: number;
}

const GRANDS_COMPTES = ['SGBCI', 'Orange CI', 'CIE', 'SODECI', 'Total Energies CI', 'Groupe Prosuma', 'Nestlé CI', 'Bolloré Transport & Logistics', 'CNAM', 'Bernabé'];
const PME_CLIENTS = ['SOCOCE', 'PlaYce', 'Groupe NSIA', 'Prosuma Distribution', 'Carrefour Marché CI'];
const PETITS_CLIENTS = ['Quincaillerie Moderne', 'Superette Les Palmiers', 'Boutique Chez Adjoua', 'Grossiste Vridi', 'Dépôt Yopougon Nord'];

export function buildDebtorProfile(tier: Tier, rng: () => number): DebtorProfile {
  switch (tier) {
    case 'excellent':
      return {
        debiteurNom: pick(rng, GRANDS_COMPTES),
        debiteurType: pick(rng, ['multinationale', 'grande_entreprise']),
        debiteurSolvabilite: 'solide',
        ancienneteRelation: 'plus_2ans',
        delaiPaiementMenu: 'a_echeance',
        tauxImpaye12m: Number(range(rng, 0, 0.01).toFixed(4)),
        partPlusGrosClient: Number(range(rng, 0.08, 0.16).toFixed(4)),
      };
    case 'bon':
      return {
        debiteurNom: pick(rng, [...GRANDS_COMPTES, ...PME_CLIENTS]),
        debiteurType: pick(rng, ['grande_entreprise', 'public_solvable']),
        debiteurSolvabilite: 'neutre',
        ancienneteRelation: pick(rng, ['plus_2ans', '6mois_2ans']),
        delaiPaiementMenu: pick(rng, ['a_echeance', 'leger_retard']),
        tauxImpaye12m: Number(range(rng, 0.01, 0.03).toFixed(4)),
        partPlusGrosClient: Number(range(rng, 0.15, 0.30).toFixed(4)),
      };
    case 'moyen':
      return {
        debiteurNom: pick(rng, PME_CLIENTS),
        debiteurType: pick(rng, ['pme_etablie', 'public_solvable']),
        debiteurSolvabilite: pick(rng, ['neutre', 'tension']),
        ancienneteRelation: '6mois_2ans',
        delaiPaiementMenu: 'leger_retard',
        tauxImpaye12m: Number(range(rng, 0.03, 0.06).toFixed(4)),
        partPlusGrosClient: Number(range(rng, 0.30, 0.45).toFixed(4)),
      };
    case 'faible':
    default:
      return {
        debiteurNom: pick(rng, PETITS_CLIENTS),
        debiteurType: pick(rng, ['petite_structure', 'particulier']),
        debiteurSolvabilite: pick(rng, ['tension', 'incident']),
        ancienneteRelation: 'premiere_transaction',
        delaiPaiementMenu: 'souvent_retard',
        tauxImpaye12m: Number(range(rng, 0.08, 0.15).toFixed(4)),
        partPlusGrosClient: Number(range(rng, 0.45, 0.70).toFixed(4)),
      };
  }
}

export interface GarantieProfile {
  garantieType: string;
  garantieCouverture: number;
}

export function buildGarantieProfile(tier: Tier, rng: () => number): GarantieProfile {
  switch (tier) {
    case 'excellent':
      return { garantieType: pick(rng, ['depot_cash', 'hypotheque']), garantieCouverture: Number(range(rng, 1.3, 1.8).toFixed(2)) };
    case 'bon':
      return { garantieType: pick(rng, ['hypotheque', 'nantissement_compte']), garantieCouverture: Number(range(rng, 1.0, 1.3).toFixed(2)) };
    case 'moyen':
      return { garantieType: pick(rng, ['nantissement_compte', 'nantissement_materiel']), garantieCouverture: Number(range(rng, 0.6, 0.9).toFixed(2)) };
    case 'faible':
    default:
      return { garantieType: pick(rng, ['caution_personnelle', 'caution_morale', 'aucune']), garantieCouverture: Number(range(rng, 0.1, 0.4).toFixed(2)) };
  }
}

// ── Répertoire de noms ivoiriens (propriétaires PME, co-membres, investisseurs) ──

export const FIRST_NAMES = [
  'Kouassi', 'Yao', 'Koffi', 'Adama', 'Ibrahim', 'Moussa', 'Serge', 'Franck', 'Didier', 'Armand',
  'Bertin', 'Cyrille', 'Fabrice', 'Ghislain', 'Hervé', 'Jean-Marc', 'Landry', 'Marc', 'Nestor', 'Olivier',
  'Patrick', 'Roger', 'Sylvain', 'Thierry', 'Wilfried', 'Aya', 'Akissi', 'Affoué', 'Adjoua', 'Aménan',
  'Ahou', 'Mariame', 'Fatou', 'Aminata', 'Christelle', 'Danielle', 'Estelle', 'Farah', 'Grâce', 'Huguette',
  'Josiane', 'Karidja', 'Laëtitia', 'Micheline', 'Nadège', 'Odile', 'Prisca', 'Raïssa', 'Sandrine', 'Viviane',
] as const;

export const LAST_NAMES = [
  'Kouassi', 'Kouamé', 'Yao', 'Koffi', 'Assoumou', 'Touré', 'Bamba', 'Diabaté', 'Coulibaly', 'Ouattara',
  'Koné', 'Traoré', 'Yéo', 'Silué', 'Soro', 'Gnamien', 'Brou', 'Aka', 'Amani', 'Kacou',
  'Angoua', 'Depry', "N'Guessan", 'Adou', 'Kadio', 'Djédjé', 'Zadi', 'Boa', 'Konaté', 'Séka',
] as const;

export function personName(rng: () => number): { firstName: string; lastName: string } {
  return { firstName: pick(rng, FIRST_NAMES), lastName: pick(rng, LAST_NAMES) };
}

export function emailSlug(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ── Organisations (30 — 6 historiques + 24 nouvelles) ──────────────────────────

export interface OrgSpec {
  legalName: string;
  registrationNumber: string;
  sector: string;
  city: string;
  foundedYear: number;
  legalForm: string;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  rejectionReason?: string;
  tier: Tier;
  sizeFactor: number;
  isTestPmeOrg?: boolean; // KAWA Services -> propriétaire = test@lefinancier.ci
}

export const ORGANIZATIONS: OrgSpec[] = [
  // -- historiques (conservées telles quelles) --
  { legalName: 'KAWA Services', registrationNumber: 'CI-ABJ-2024-B-9001', sector: 'Services B2B', city: 'Abidjan', foundedYear: 2018, legalForm: 'SARL', verificationStatus: 'VERIFIED', tier: 'bon', sizeFactor: 1.4, isTestPmeOrg: true },
  { legalName: 'AGRO MORONOU', registrationNumber: 'CI-ABJ-2024-B-9002', sector: 'Agriculture', city: 'Aboisso', foundedYear: 2012, legalForm: 'SA', verificationStatus: 'VERIFIED', tier: 'excellent', sizeFactor: 3.2 },
  { legalName: 'FRESHNI', registrationNumber: 'CI-ABJ-2024-B-9003', sector: 'Agroalimentaire', city: 'Abidjan', foundedYear: 2016, legalForm: 'SARL', verificationStatus: 'VERIFIED', tier: 'bon', sizeFactor: 1.1 },
  { legalName: 'LogiTrans CI', registrationNumber: 'CI-ABJ-2024-B-9004', sector: 'Transport & Logistique', city: 'Abidjan', foundedYear: 2019, legalForm: 'SA', verificationStatus: 'VERIFIED', tier: 'faible', sizeFactor: 2.0 },
  { legalName: 'SolarTech Abidjan', registrationNumber: 'CI-ABJ-2024-B-9005', sector: 'Énergie', city: 'Abidjan', foundedYear: 2020, legalForm: 'SARL', verificationStatus: 'VERIFIED', tier: 'moyen', sizeFactor: 1.6 },
  { legalName: 'Pharmacie Du Golfe', registrationNumber: 'CI-ABJ-2024-B-9006', sector: 'Santé', city: 'Abidjan', foundedYear: 2015, legalForm: 'SUARL', verificationStatus: 'VERIFIED', tier: 'excellent', sizeFactor: 0.8 },

  // -- nouvelles --
  { legalName: 'TransCargo Bouaké', registrationNumber: 'CI-ABJ-2024-B-9007', sector: 'Transport & Logistique', city: 'Bouaké', foundedYear: 2014, legalForm: 'SARL', verificationStatus: 'VERIFIED', tier: 'bon', sizeFactor: 1.5 },
  { legalName: 'Ivoire BTP Construction', registrationNumber: 'CI-ABJ-2024-B-9008', sector: 'BTP & Construction', city: 'Yamoussoukro', foundedYear: 2011, legalForm: 'SA', verificationStatus: 'VERIFIED', tier: 'moyen', sizeFactor: 2.4 },
  { legalName: 'Atlantique Textile', registrationNumber: 'CI-ABJ-2024-B-9009', sector: 'Textile & Mode', city: 'Abidjan', foundedYear: 2017, legalForm: 'SARL', verificationStatus: 'VERIFIED', tier: 'bon', sizeFactor: 1.0 },
  { legalName: 'San-Pédro Négoce', registrationNumber: 'CI-ABJ-2024-B-9010', sector: 'Import-Export', city: 'San-Pédro', foundedYear: 2021, legalForm: 'SARL', verificationStatus: 'PENDING', tier: 'faible', sizeFactor: 1.3 },
  { legalName: 'Korhogo Coton SA', registrationNumber: 'CI-ABJ-2024-B-9011', sector: 'Agriculture', city: 'Korhogo', foundedYear: 2009, legalForm: 'SA', verificationStatus: 'VERIFIED', tier: 'excellent', sizeFactor: 3.6 },
  { legalName: 'DigitalPay CI', registrationNumber: 'CI-ABJ-2024-B-9012', sector: 'Technologie / Fintech', city: 'Abidjan', foundedYear: 2021, legalForm: 'SAS', verificationStatus: 'VERIFIED', tier: 'excellent', sizeFactor: 0.9 },
  { legalName: 'AgriTech Savane', registrationNumber: 'CI-ABJ-2024-B-9013', sector: 'Technologie / Fintech', city: 'Korhogo', foundedYear: 2022, legalForm: 'SAS', verificationStatus: 'VERIFIED', tier: 'bon', sizeFactor: 0.6 },
  { legalName: 'Hôtel Baie des Sirènes', registrationNumber: 'CI-ABJ-2024-B-9014', sector: 'Tourisme & Hôtellerie', city: 'Grand-Bassam', foundedYear: 2013, legalForm: 'SARL', verificationStatus: 'VERIFIED', tier: 'moyen', sizeFactor: 1.8 },
  { legalName: 'EduPlus Académie', registrationNumber: 'CI-ABJ-2024-B-9015', sector: 'Éducation', city: 'Abidjan', foundedYear: 2016, legalForm: 'SARL', verificationStatus: 'VERIFIED', tier: 'bon', sizeFactor: 1.0 },
  { legalName: 'Immo Lagunes', registrationNumber: 'CI-ABJ-2024-B-9016', sector: 'Immobilier', city: 'Abidjan', foundedYear: 2010, legalForm: 'SA', verificationStatus: 'VERIFIED', tier: 'moyen', sizeFactor: 2.8 },
  { legalName: 'Aqua Pêche Fresco', registrationNumber: 'CI-ABJ-2024-B-9017', sector: 'Pêche & Aquaculture', city: 'Fresco', foundedYear: 2019, legalForm: 'SARL', verificationStatus: 'REJECTED', rejectionReason: 'États financiers incohérents et absence de justificatifs de revenus.', tier: 'faible', sizeFactor: 0.7 },
  { legalName: 'Or Blanc Mines', registrationNumber: 'CI-ABJ-2024-B-9018', sector: 'Mines & Carrières', city: 'Odienné', foundedYear: 2015, legalForm: 'SA', verificationStatus: 'VERIFIED', tier: 'moyen', sizeFactor: 2.6 },
  { legalName: 'Conseil & Stratégie Abidjan', registrationNumber: 'CI-ABJ-2024-B-9019', sector: 'Services B2B', city: 'Abidjan', foundedYear: 2014, legalForm: 'SARL', verificationStatus: 'VERIFIED', tier: 'excellent', sizeFactor: 1.2 },
  { legalName: 'Chez Tantie Restauration', registrationNumber: 'CI-ABJ-2024-B-9020', sector: 'Restauration', city: 'Abidjan', foundedYear: 2020, legalForm: 'Entreprise Individuelle', verificationStatus: 'PENDING', tier: 'faible', sizeFactor: 0.4 },
  { legalName: 'Bois Précieux CI', registrationNumber: 'CI-ABJ-2024-B-9021', sector: 'Import-Export', city: 'Man', foundedYear: 2017, legalForm: 'SARL', verificationStatus: 'VERIFIED', tier: 'faible', sizeFactor: 1.5 },
  { legalName: 'Cacao Excellence Daloa', registrationNumber: 'CI-ABJ-2024-B-9022', sector: 'Agriculture', city: 'Daloa', foundedYear: 2008, legalForm: 'SA', verificationStatus: 'VERIFIED', tier: 'excellent', sizeFactor: 3.0 },
  { legalName: 'MedPlus Diagnostics', registrationNumber: 'CI-ABJ-2024-B-9023', sector: 'Santé', city: 'Abidjan', foundedYear: 2020, legalForm: 'SAS', verificationStatus: 'VERIFIED', tier: 'bon', sizeFactor: 1.1 },
  { legalName: 'Garage Auto Plus', registrationNumber: 'CI-ABJ-2024-B-9024', sector: 'Automobile', city: 'Abidjan', foundedYear: 2016, legalForm: 'SARL', verificationStatus: 'VERIFIED', tier: 'moyen', sizeFactor: 0.9 },
  { legalName: 'WaxPrint Mode', registrationNumber: 'CI-ABJ-2024-B-9025', sector: 'Textile & Mode', city: 'Bouaké', foundedYear: 2018, legalForm: 'SARL', verificationStatus: 'VERIFIED', tier: 'moyen', sizeFactor: 1.0 },
  { legalName: 'Gagnoa Palm Oil', registrationNumber: 'CI-ABJ-2024-B-9026', sector: 'Agroalimentaire', city: 'Gagnoa', foundedYear: 2012, legalForm: 'SA', verificationStatus: 'VERIFIED', tier: 'bon', sizeFactor: 2.2 },
  { legalName: 'Media Ivoire Digital', registrationNumber: 'CI-ABJ-2024-B-9027', sector: 'Media & Communication', city: 'Abidjan', foundedYear: 2021, legalForm: 'SAS', verificationStatus: 'PENDING', tier: 'faible', sizeFactor: 0.5 },
  { legalName: 'Bâtiss Pro CI', registrationNumber: 'CI-ABJ-2024-B-9028', sector: 'BTP & Construction', city: 'Abidjan', foundedYear: 2015, legalForm: 'SARL', verificationStatus: 'VERIFIED', tier: 'moyen', sizeFactor: 1.7 },
  { legalName: 'Artisanat des Lagunes', registrationNumber: 'CI-ABJ-2024-B-9029', sector: 'Artisanat', city: 'Grand-Bassam', foundedYear: 2019, legalForm: 'Entreprise Individuelle', verificationStatus: 'REJECTED', rejectionReason: "RCCM non fourni malgré deux relances.", tier: 'faible', sizeFactor: 0.3 },
  { legalName: 'NRJ Solaire Divo', registrationNumber: 'CI-ABJ-2024-B-9030', sector: 'Énergie', city: 'Divo', foundedYear: 2017, legalForm: 'SARL', verificationStatus: 'VERIFIED', tier: 'bon', sizeFactor: 1.3 },
];

// ── Demandes de financement (38, référencées par registrationNumber) ──────────

export interface FundingSpec {
  registrationNumber: string;
  title: string;
  description: string;
  category: Category;
  amountRequested: number;
  durationMonths: number;
  expectedReturn: number;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'PUBLISHED' | 'FUNDED' | 'CLOSED' | 'REJECTED' | 'CANCELLED';
  createdDaysAgo: number;
  rejectionReason?: string;
  skipScoring?: boolean; // laisse le dossier "à scorer" (badge admin)
  forceScoringError?: string; // simule un échec de calcul passé
}

export const FUNDING_REQUESTS: FundingSpec[] = [
  { registrationNumber: 'CI-ABJ-2024-B-9001', title: 'Rachat de factures clients grands comptes', description: 'Rachat de 3 factures clients grands comptes (SGBCI, Orange CI). Taux de récurrence élevé.', category: 'FACTURE', amountRequested: 120_000_000, durationMonths: 3, expectedReturn: 8.5, status: 'PUBLISHED', createdDaysAgo: 25 },
  { registrationNumber: 'CI-ABJ-2024-B-9001', title: "Ligne de trésorerie pour campagne d'export", description: "Prêt court terme pour financer une campagne d'export vers le Ghana et le Mali.", category: 'PRET', amountRequested: 45_000_000, durationMonths: 12, expectedReturn: 10.5, status: 'UNDER_REVIEW', createdDaysAgo: 4 },

  { registrationNumber: 'CI-ABJ-2024-B-9002', title: 'Financement campagne cacaoière 2026-2027', description: 'Financement de la campagne cacaoière 2026-2027. Garantie OHADA + nantissement stock.', category: 'PRET', amountRequested: 500_000_000, durationMonths: 24, expectedReturn: 11, status: 'FUNDED', createdDaysAgo: 210 },
  { registrationNumber: 'CI-ABJ-2024-B-9002', title: 'Factures coopératives agricoles partenaires', description: "Rachat de factures émises auprès de coopératives partenaires solvables.", category: 'FACTURE', amountRequested: 60_000_000, durationMonths: 2, expectedReturn: 7.5, status: 'CLOSED', createdDaysAgo: 300 },

  { registrationNumber: 'CI-ABJ-2024-B-9003', title: 'Factures grande distribution', description: "Factures de livraison à la grande distribution (SOCOCE, PlaYce). Délai de paiement 60j.", category: 'FACTURE', amountRequested: 75_000_000, durationMonths: 2, expectedReturn: 7.8, status: 'PUBLISHED', createdDaysAgo: 20 },

  { registrationNumber: 'CI-ABJ-2024-B-9004', title: 'Participation minoritaire holding logistique régionale', description: 'Participation minoritaire (12%) dans une holding logistique en expansion régionale (5 pays CEDEAO).', category: 'EQUITY', amountRequested: 250_000_000, durationMonths: 36, expectedReturn: 15, status: 'PUBLISHED', createdDaysAgo: 60 },

  { registrationNumber: 'CI-ABJ-2024-B-9005', title: 'Financement kits solaires PME industrielles', description: 'Financement de 200 installations solaires pour les PME industrielles. Subvention partielle CIE.', category: 'PRET', amountRequested: 180_000_000, durationMonths: 18, expectedReturn: 9.2, status: 'PUBLISHED', createdDaysAgo: 3 },

  { registrationNumber: 'CI-ABJ-2024-B-9006', title: 'Factures CNAM et mutuelles', description: "Factures CNAM et mutuelles d'entreprise. Secteur réglementé à faible risque de défaut.", category: 'FACTURE', amountRequested: 55_000_000, durationMonths: 1, expectedReturn: 8, status: 'PUBLISHED', createdDaysAgo: 30 },

  { registrationNumber: 'CI-ABJ-2024-B-9007', title: 'Renouvellement flotte poids lourds', description: 'Acquisition de 4 camions pour le corridor Bouaké-Abidjan-Ouagadougou.', category: 'PRET', amountRequested: 220_000_000, durationMonths: 30, expectedReturn: 10, status: 'FUNDED', createdDaysAgo: 150 },
  { registrationNumber: 'CI-ABJ-2024-B-9007', title: 'Factures transport sous contrat cadre', description: 'Factures de transport sous contrat cadre avec un groupe agro-industriel.', category: 'FACTURE', amountRequested: 40_000_000, durationMonths: 2, expectedReturn: 7.2, status: 'PUBLISHED', createdDaysAgo: 12 },

  { registrationNumber: 'CI-ABJ-2024-B-9008', title: 'Chantier résidentiel Yamoussoukro Zone 4', description: 'Financement matériaux et main d\'œuvre pour un programme de 40 logements.', category: 'PRET', amountRequested: 300_000_000, durationMonths: 20, expectedReturn: 11.5, status: 'UNDER_REVIEW', createdDaysAgo: 6 },

  { registrationNumber: 'CI-ABJ-2024-B-9009', title: "Collection prêt-à-porter export sous-région", description: "Financement d'une collection destinée à l'export CEDEAO.", category: 'FACTURE', amountRequested: 35_000_000, durationMonths: 3, expectedReturn: 7.6, status: 'PUBLISHED', createdDaysAgo: 18 },

  { registrationNumber: 'CI-ABJ-2024-B-9010', title: 'Import de matériel électroménager', description: "Financement d'un conteneur de matériel électroménager importé d'Asie.", category: 'FACTURE', amountRequested: 28_000_000, durationMonths: 2, expectedReturn: 9.5, status: 'DRAFT', createdDaysAgo: 2 },

  { registrationNumber: 'CI-ABJ-2024-B-9011', title: 'Extension unité d\'égrenage de coton', description: "Extension de capacité de l'unité d'égrenage avant la prochaine campagne.", category: 'PRET', amountRequested: 600_000_000, durationMonths: 36, expectedReturn: 10.8, status: 'PUBLISHED', createdDaysAgo: 40 },
  { registrationNumber: 'CI-ABJ-2024-B-9011', title: 'Factures export coton graine', description: 'Rachat de factures export auprès de négociants internationaux solvables.', category: 'FACTURE', amountRequested: 90_000_000, durationMonths: 2, expectedReturn: 7, status: 'CLOSED', createdDaysAgo: 260 },

  { registrationNumber: 'CI-ABJ-2024-B-9012', title: 'Levée pour expansion paiement marchand CEDEAO', description: "Levée de fonds pour l'expansion de la solution de paiement marchand dans 3 nouveaux pays.", category: 'EQUITY', amountRequested: 380_000_000, durationMonths: 48, expectedReturn: 18, status: 'PUBLISHED', createdDaysAgo: 45 },
  { registrationNumber: 'CI-ABJ-2024-B-9012', title: "Ligne de trésorerie technique", description: "Prêt relais pour financer l'infrastructure technique avant clôture de levée.", category: 'PRET', amountRequested: 60_000_000, durationMonths: 9, expectedReturn: 11, status: 'UNDER_REVIEW', createdDaysAgo: 5, skipScoring: true },

  { registrationNumber: 'CI-ABJ-2024-B-9013', title: 'Levée Série Seed agritech', description: "Levée de fonds pour déployer la plateforme de conseil agricole par SMS dans le Nord.", category: 'EQUITY', amountRequested: 150_000_000, durationMonths: 36, expectedReturn: 16, status: 'PUBLISHED', createdDaysAgo: 55 },

  { registrationNumber: 'CI-ABJ-2024-B-9014', title: 'Rénovation 40 chambres front de mer', description: "Rénovation complète de l'aile front de mer avant la saison touristique.", category: 'PRET', amountRequested: 140_000_000, durationMonths: 24, expectedReturn: 11.2, status: 'PUBLISHED', createdDaysAgo: 33 },

  { registrationNumber: 'CI-ABJ-2024-B-9015', title: "Construction nouveau campus", description: "Construction d'un second campus pour absorber la liste d'attente.", category: 'PRET', amountRequested: 200_000_000, durationMonths: 24, expectedReturn: 10.5, status: 'PUBLISHED', createdDaysAgo: 27 },

  { registrationNumber: 'CI-ABJ-2024-B-9016', title: 'Participation programme résidentiel Cocody', description: 'Participation minoritaire dans un programme résidentiel haut standing.', category: 'EQUITY', amountRequested: 320_000_000, durationMonths: 30, expectedReturn: 14, status: 'PUBLISHED', createdDaysAgo: 70 },
  { registrationNumber: 'CI-ABJ-2024-B-9016', title: 'Avance sur loyers commerciaux', description: 'Avance sur loyers commerciaux à échoir sur un centre commercial en exploitation.', category: 'FACTURE', amountRequested: 65_000_000, durationMonths: 3, expectedReturn: 8.2, status: 'PUBLISHED', createdDaysAgo: 15 },

  { registrationNumber: 'CI-ABJ-2024-B-9017', title: 'Rachat de factures export poisson fumé', description: 'Rachat de factures sur des clients grossistes régionaux.', category: 'FACTURE', amountRequested: 18_000_000, durationMonths: 2, expectedReturn: 9.8, status: 'REJECTED', createdDaysAgo: 35, rejectionReason: "Organisation non vérifiée : dossier KYC incomplet." },

  { registrationNumber: 'CI-ABJ-2024-B-9018', title: "Renouvellement d'équipement d'extraction", description: "Financement d'un nouveau concasseur et de véhicules d'exploitation.", category: 'PRET', amountRequested: 260_000_000, durationMonths: 24, expectedReturn: 12, status: 'UNDER_REVIEW', createdDaysAgo: 8, forceScoringError: "Champ 'garantieCouverture' invalide reçu du formulaire (NaN) — recalcul requis après correction." },

  { registrationNumber: 'CI-ABJ-2024-B-9019', title: 'Factures missions de conseil', description: 'Rachat de factures de missions de conseil auprès de grands groupes clients.', category: 'FACTURE', amountRequested: 30_000_000, durationMonths: 1, expectedReturn: 7, status: 'PUBLISHED', createdDaysAgo: 10 },
  { registrationNumber: 'CI-ABJ-2024-B-9019', title: 'Participation développement offre data', description: "Levée pour développer une offre d'analyse de données sectorielle.", category: 'EQUITY', amountRequested: 100_000_000, durationMonths: 24, expectedReturn: 15, status: 'DRAFT', createdDaysAgo: 1 },

  { registrationNumber: 'CI-ABJ-2024-B-9020', title: 'Achat équipement cuisine et mobilier', description: "Financement de l'ouverture d'un second point de vente.", category: 'PRET', amountRequested: 15_000_000, durationMonths: 12, expectedReturn: 13, status: 'CANCELLED', createdDaysAgo: 90 },

  { registrationNumber: 'CI-ABJ-2024-B-9021', title: "Import de bois d'œuvre", description: "Financement d'une cargaison de bois d'œuvre importée pour transformation locale.", category: 'PRET', amountRequested: 80_000_000, durationMonths: 15, expectedReturn: 13.5, status: 'PUBLISHED', createdDaysAgo: 22 },

  { registrationNumber: 'CI-ABJ-2024-B-9022', title: 'Préfinancement campagne cacao export premium', description: 'Préfinancement de la campagne export premium auprès de torréfacteurs européens.', category: 'PRET', amountRequested: 450_000_000, durationMonths: 18, expectedReturn: 10.2, status: 'FUNDED', createdDaysAgo: 180 },
  { registrationNumber: 'CI-ABJ-2024-B-9022', title: 'Factures export cacao certifié', description: 'Rachat de factures export auprès de négociants certifiés UTZ/Rainforest.', category: 'FACTURE', amountRequested: 95_000_000, durationMonths: 2, expectedReturn: 7.2, status: 'CLOSED', createdDaysAgo: 240 },

  { registrationNumber: 'CI-ABJ-2024-B-9023', title: 'Participation ouverture 3 centres de diagnostic', description: "Levée pour ouvrir 3 nouveaux centres d'imagerie médicale en régions.", category: 'EQUITY', amountRequested: 220_000_000, durationMonths: 36, expectedReturn: 14.5, status: 'PUBLISHED', createdDaysAgo: 48 },

  { registrationNumber: 'CI-ABJ-2024-B-9024', title: "Financement stock pièces détachées", description: "Constitution d'un stock de pièces détachées pour la saison haute.", category: 'PRET', amountRequested: 35_000_000, durationMonths: 10, expectedReturn: 12.5, status: 'PUBLISHED', createdDaysAgo: 14 },

  { registrationNumber: 'CI-ABJ-2024-B-9025', title: 'Participation développement marque régionale', description: 'Levée pour développer la distribution de la marque dans 4 pays CEDEAO.', category: 'EQUITY', amountRequested: 130_000_000, durationMonths: 30, expectedReturn: 16.5, status: 'UNDER_REVIEW', createdDaysAgo: 7 },

  { registrationNumber: 'CI-ABJ-2024-B-9026', title: "Extension unité de raffinage", description: "Extension de la capacité de raffinage d'huile de palme.", category: 'PRET', amountRequested: 340_000_000, durationMonths: 24, expectedReturn: 10.6, status: 'PUBLISHED', createdDaysAgo: 38 },

  { registrationNumber: 'CI-ABJ-2024-B-9027', title: 'Participation studio de production digitale', description: "Levée pour équiper un studio de production de contenu digital régional.", category: 'EQUITY', amountRequested: 70_000_000, durationMonths: 24, expectedReturn: 17, status: 'REJECTED', createdDaysAgo: 50, rejectionReason: "Modèle économique jugé insuffisamment documenté pour ce stade." },

  { registrationNumber: 'CI-ABJ-2024-B-9028', title: 'Factures chantiers publics livrés', description: 'Rachat de factures sur marchés publics déjà réceptionnés.', category: 'FACTURE', amountRequested: 50_000_000, durationMonths: 3, expectedReturn: 8.4, status: 'PUBLISHED', createdDaysAgo: 16 },

  { registrationNumber: 'CI-ABJ-2024-B-9029', title: 'Fonds de roulement collection artisanale', description: "Financement du fonds de roulement pour la saison touristique.", category: 'FACTURE', amountRequested: 8_000_000, durationMonths: 2, expectedReturn: 9, status: 'CANCELLED', createdDaysAgo: 100 },

  { registrationNumber: 'CI-ABJ-2024-B-9030', title: 'Installation centrale solaire industrielle', description: "Installation d'une centrale solaire pour un client industriel sous PPA 10 ans.", category: 'PRET', amountRequested: 190_000_000, durationMonths: 24, expectedReturn: 9.8, status: 'UNDER_REVIEW', createdDaysAgo: 9 },
];

// ── Institutions financières (7) ────────────────────────────────────────────────

export interface InstitutionMemberSpec {
  email: string;
  firstName: string;
  lastName: string;
  role: 'OWNER' | 'ANALYST' | 'COMPLIANCE';
  status: 'ACTIVE' | 'TRAINING';
  specialty?: string;
  kycStatus: 'VERIFIED' | 'PENDING';
}

export interface InstitutionSpec {
  name: string;
  type: string;
  bceaoApprovalNumber: string;
  city: string;
  envelopeMax: number;
  ticketMin: number;
  ticketMax: number;
  excludedSectors: string[];
  ownerTestEmail?: string; // banque@lefinancier.ci -> Banque Atlantique CI
  members: InstitutionMemberSpec[];
}

export const INSTITUTIONS: InstitutionSpec[] = [
  {
    name: 'Banque Atlantique CI',
    type: 'Banque commerciale',
    bceaoApprovalNumber: 'CI-B-2010-001',
    city: 'Plateau, Avenue Botreau Roussel',
    envelopeMax: 1_000_000_000,
    ticketMin: 25_000_000,
    ticketMax: 500_000_000,
    excludedSectors: ['Tabac', 'Armement', 'Jeux', 'Alcool'],
    ownerTestEmail: 'banque@lefinancier.ci',
    members: [
      { email: 'k.assoumou@banque-atlantique.ci', firstName: 'Kouamé', lastName: 'Assoumou', role: 'ANALYST', status: 'ACTIVE', specialty: 'Affacturage & Prêts', kycStatus: 'VERIFIED' },
      { email: 'm.toure@banque-atlantique.ci', firstName: 'Mariame', lastName: 'Touré', role: 'ANALYST', status: 'ACTIVE', specialty: 'Prêts MLT & Equity', kycStatus: 'VERIFIED' },
      { email: 's.bamba@banque-atlantique.ci', firstName: 'Serge', lastName: 'Bamba', role: 'COMPLIANCE', status: 'ACTIVE', specialty: 'Conformité & AML', kycStatus: 'VERIFIED' },
    ],
  },
  {
    name: 'NSIA Banque CI',
    type: 'Banque commerciale',
    bceaoApprovalNumber: 'CI-B-2005-014',
    city: 'Plateau, Avenue Franchet d\'Esperey',
    envelopeMax: 1_500_000_000,
    ticketMin: 30_000_000,
    ticketMax: 600_000_000,
    excludedSectors: ['Tabac', 'Armement', 'Mines artisanales'],
    members: [
      { email: 'd.kone@nsia-banque.ci', firstName: 'Didier', lastName: 'Koné', role: 'OWNER', status: 'ACTIVE', kycStatus: 'VERIFIED' },
      { email: 'f.yeo@nsia-banque.ci', firstName: 'Fabrice', lastName: 'Yéo', role: 'ANALYST', status: 'ACTIVE', specialty: 'Financement agro-industriel', kycStatus: 'VERIFIED' },
      { email: 'j.kacou@nsia-banque.ci', firstName: 'Josiane', lastName: 'Kacou', role: 'ANALYST', status: 'TRAINING', specialty: 'PME & commerce', kycStatus: 'VERIFIED' },
      { email: 'r.silue@nsia-banque.ci', firstName: 'Roger', lastName: 'Silué', role: 'COMPLIANCE', status: 'ACTIVE', specialty: 'Conformité BCEAO', kycStatus: 'VERIFIED' },
    ],
  },
  {
    name: 'Société Générale CI',
    type: 'Banque commerciale',
    bceaoApprovalNumber: 'CI-B-1998-002',
    city: 'Plateau, Avenue Lamblin',
    envelopeMax: 2_000_000_000,
    ticketMin: 50_000_000,
    ticketMax: 800_000_000,
    excludedSectors: ['Tabac', 'Armement', 'Jeux'],
    members: [
      { email: 'a.kadio@sgci.ci', firstName: 'Armand', lastName: 'Kadio', role: 'OWNER', status: 'ACTIVE', kycStatus: 'PENDING' },
      { email: 'c.brou@sgci.ci', firstName: 'Christelle', lastName: 'Brou', role: 'ANALYST', status: 'ACTIVE', specialty: 'Corporate & Equity', kycStatus: 'VERIFIED' },
      { email: 'g.amani@sgci.ci', firstName: 'Ghislain', lastName: 'Amani', role: 'ANALYST', status: 'ACTIVE', specialty: 'Financement structuré', kycStatus: 'VERIFIED' },
      { email: 'v.angoua@sgci.ci', firstName: 'Viviane', lastName: 'Angoua', role: 'COMPLIANCE', status: 'ACTIVE', specialty: 'LAB-CFT', kycStatus: 'VERIFIED' },
    ],
  },
  {
    name: "Ecobank Côte d'Ivoire",
    type: 'Banque commerciale',
    bceaoApprovalNumber: 'CI-B-1990-005',
    city: 'Plateau, Boulevard Botreau Roussel',
    envelopeMax: 1_800_000_000,
    ticketMin: 40_000_000,
    ticketMax: 700_000_000,
    excludedSectors: ['Tabac', 'Armement'],
    members: [
      { email: 'h.depry@ecobank.ci', firstName: 'Hervé', lastName: 'Depry', role: 'OWNER', status: 'ACTIVE', kycStatus: 'VERIFIED' },
      { email: 'l.gnamien@ecobank.ci', firstName: 'Landry', lastName: 'Gnamien', role: 'ANALYST', status: 'ACTIVE', specialty: 'Transport & logistique', kycStatus: 'VERIFIED' },
      { email: 'n.adou@ecobank.ci', firstName: 'Nadège', lastName: 'Adou', role: 'ANALYST', status: 'ACTIVE', specialty: 'Santé & éducation', kycStatus: 'VERIFIED' },
      { email: 't.boa@ecobank.ci', firstName: 'Thierry', lastName: 'Boa', role: 'COMPLIANCE', status: 'ACTIVE', specialty: 'Conformité & AML', kycStatus: 'VERIFIED' },
    ],
  },
  {
    name: 'Bridge Bank Group CI',
    type: "Banque d'investissement",
    bceaoApprovalNumber: 'CI-B-2015-021',
    city: 'Cocody, Rue des Jardins',
    envelopeMax: 900_000_000,
    ticketMin: 60_000_000,
    ticketMax: 400_000_000,
    excludedSectors: ['Tabac', 'Armement', 'Jeux', 'Mines artisanales'],
    members: [
      { email: 'o.zadi@bridgebankgroup.ci', firstName: 'Olivier', lastName: 'Zadi', role: 'OWNER', status: 'ACTIVE', kycStatus: 'PENDING' },
      { email: 'p.djedje@bridgebankgroup.ci', firstName: 'Patrick', lastName: 'Djédjé', role: 'ANALYST', status: 'ACTIVE', specialty: 'Equity & levées', kycStatus: 'VERIFIED' },
      { email: 's.konate@bridgebankgroup.ci', firstName: 'Sylvain', lastName: 'Konaté', role: 'COMPLIANCE', status: 'ACTIVE', specialty: 'Conformité marchés', kycStatus: 'VERIFIED' },
    ],
  },
  {
    name: "Advans Côte d'Ivoire",
    type: 'Institution de microfinance',
    bceaoApprovalNumber: 'CI-M-2012-033',
    city: 'Marcory, Zone 4',
    envelopeMax: 350_000_000,
    ticketMin: 5_000_000,
    ticketMax: 80_000_000,
    excludedSectors: ['Tabac', 'Armement', 'Jeux', 'Alcool', 'Mines artisanales'],
    members: [
      { email: 'w.kouame@advans.ci', firstName: 'Wilfried', lastName: 'Kouamé', role: 'OWNER', status: 'ACTIVE', kycStatus: 'VERIFIED' },
      { email: 'e.kouassi@advans.ci', firstName: 'Estelle', lastName: 'Kouassi', role: 'ANALYST', status: 'ACTIVE', specialty: 'Micro-entreprises & artisanat', kycStatus: 'VERIFIED' },
      { email: 'm.traore@advans.ci', firstName: 'Micheline', lastName: 'Traoré', role: 'COMPLIANCE', status: 'ACTIVE', specialty: 'Conformité microfinance', kycStatus: 'VERIFIED' },
    ],
  },
  {
    name: "Baobab Côte d'Ivoire",
    type: 'Institution de microfinance',
    bceaoApprovalNumber: 'CI-M-2009-011',
    city: 'Adjamé, Boulevard Nangui Abrogoua',
    envelopeMax: 300_000_000,
    ticketMin: 3_000_000,
    ticketMax: 60_000_000,
    excludedSectors: ['Tabac', 'Armement', 'Jeux', 'Alcool'],
    members: [
      { email: 'b.soro@baobab.ci', firstName: 'Bertin', lastName: 'Soro', role: 'OWNER', status: 'ACTIVE', kycStatus: 'VERIFIED' },
      { email: 'r.kone@baobab.ci', firstName: 'Raïssa', lastName: 'Koné', role: 'ANALYST', status: 'TRAINING', specialty: 'Commerce de détail', kycStatus: 'VERIFIED' },
      { email: 'j.aka@baobab.ci', firstName: 'Jean-Marc', lastName: 'Aka', role: 'COMPLIANCE', status: 'ACTIVE', specialty: 'Conformité microfinance', kycStatus: 'VERIFIED' },
    ],
  },
];

// ── Investisseurs individuels indépendants (hors institutions) ─────────────────

export interface InvestorSpec {
  email: string;
  firstName: string;
  lastName: string;
  kycStatus: 'VERIFIED' | 'PENDING';
}

export const INDEPENDENT_INVESTORS: InvestorSpec[] = [
  { email: 'c.yao@investisseur.ci', firstName: 'Cyrille', lastName: 'Yao', kycStatus: 'VERIFIED' },
  { email: 'f.kone@investisseur.ci', firstName: 'Farah', lastName: 'Koné', kycStatus: 'VERIFIED' },
  { email: 'g.brou@investisseur.ci', firstName: 'Grâce', lastName: 'Brou', kycStatus: 'VERIFIED' },
  { email: 'h.toure@investisseur.ci', firstName: 'Huguette', lastName: 'Touré', kycStatus: 'PENDING' },
  { email: 'i.diabate@investisseur.ci', firstName: 'Ibrahim', lastName: 'Diabaté', kycStatus: 'VERIFIED' },
  { email: 'k.silue@investisseur.ci', firstName: 'Karidja', lastName: 'Silué', kycStatus: 'VERIFIED' },
  { email: 'm.adou@investisseur.ci', firstName: 'Marc', lastName: 'Adou', kycStatus: 'VERIFIED' },
  { email: 'n.bamba@investisseur.ci', firstName: 'Nestor', lastName: 'Bamba', kycStatus: 'PENDING' },
  { email: 'o.coulibaly@investisseur.ci', firstName: 'Odile', lastName: 'Coulibaly', kycStatus: 'VERIFIED' },
  { email: 'p.gnamien@investisseur.ci', firstName: 'Prisca', lastName: 'Gnamien', kycStatus: 'VERIFIED' },
  { email: 's.kadio@investisseur.ci', firstName: 'Sandrine', lastName: 'Kadio', kycStatus: 'VERIFIED' },
  { email: 't.ouattara@investisseur.ci', firstName: 'Thierry', lastName: 'Ouattara', kycStatus: 'VERIFIED' },
  { email: 'a.affoue@investisseur.ci', firstName: 'Affoué', lastName: 'Kouassi', kycStatus: 'VERIFIED' },
  { email: 'b.ahou@investisseur.ci', firstName: 'Ahou', lastName: 'Angoua', kycStatus: 'VERIFIED' },
  { email: 'd.moussa@investisseur.ci', firstName: 'Moussa', lastName: 'Traoré', kycStatus: 'VERIFIED' },
  { email: 'e.laetitia@investisseur.ci', firstName: 'Laëtitia', lastName: "N'Guessan", kycStatus: 'VERIFIED' },
  { email: 'l.landry@investisseur.ci', firstName: 'Landry', lastName: 'Depry', kycStatus: 'PENDING' },
  { email: 'r.roger@investisseur.ci', firstName: 'Roger', lastName: 'Boa', kycStatus: 'VERIFIED' },
  { email: 's.serge@investisseur.ci', firstName: 'Serge', lastName: 'Kacou', kycStatus: 'VERIFIED' },
  { email: 'w.aminata@investisseur.ci', firstName: 'Aminata', lastName: 'Coulibaly', kycStatus: 'VERIFIED' },
  { email: 'y.olivier@investisseur.ci', firstName: 'Olivier', lastName: 'Séka', kycStatus: 'VERIFIED' },
  { email: 'z.danielle@investisseur.ci', firstName: 'Danielle', lastName: 'Zadi', kycStatus: 'VERIFIED' },
  { email: 'x.franck@investisseur.ci', firstName: 'Franck', lastName: 'Yéo', kycStatus: 'VERIFIED' },
  { email: 'v.adjoua@investisseur.ci', firstName: 'Adjoua', lastName: 'Konaté', kycStatus: 'VERIFIED' },
];
