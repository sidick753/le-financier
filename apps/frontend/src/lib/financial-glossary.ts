// Source unique des définitions de termes financiers utilisées sur toute la
// plateforme : page publique /glossaire ET info-bulles (i) affichées à côté
// des labels techniques dans les formulaires et fiches d'opportunité.
// Un seul endroit à mettre à jour pour garder les définitions cohérentes.

export interface GlossaryTerm {
  id: string;
  term: string;
  category: string;
  definition: string;
}

export const GLOSSARY_CATEGORIES = [
  "Produits de financement",
  "Taux, rendement & scoring",
  "Ratios financiers",
  "Garanties",
  "Vérification & conformité",
  "Fonctionnement de la plateforme",
] as const;

export const GLOSSARY: GlossaryTerm[] = [
  // ── Produits de financement ──────────────────────────────────────────────
  {
    id: "affacturage",
    term: "Affacturage",
    category: "Produits de financement",
    definition:
      "Vous vendez une facture client en attente de paiement à un investisseur, qui vous avance l'argent immédiatement moyennant une commission. Vous n'attendez plus l'échéance de paiement de votre client pour être payé.",
  },
  {
    id: "pret-mlt",
    term: "Prêt MLT (moyen-long terme)",
    category: "Produits de financement",
    definition:
      "Emprunt classique remboursé par échéances sur une durée de plusieurs mois à plusieurs années, pour financer du matériel, du stock ou une expansion.",
  },
  {
    id: "equity",
    term: "Equity (levée de fonds)",
    category: "Produits de financement",
    definition:
      "Financement en échange d'une part du capital de votre entreprise (actions). Aucun remboursement mensuel : l'investisseur devient copropriétaire et partage les gains ou les pertes futures.",
  },
  {
    id: "investisseur-unique",
    term: "Investisseur unique / Plusieurs investisseurs",
    category: "Produits de financement",
    definition:
      "Une PME peut choisir d'être financée par un seul investisseur pour 100% du montant demandé, ou de le partager entre plusieurs investisseurs qui se répartissent le total.",
  },

  // ── Taux, rendement & scoring ────────────────────────────────────────────
  {
    id: "taux-rendement",
    term: "Taux / Rendement proposé",
    category: "Taux, rendement & scoring",
    definition:
      "Pourcentage que l'investisseur perçoit en plus du montant investi, versé à l'échéance ou selon l'échéancier convenu dans le contrat.",
  },
  {
    id: "gain-estime",
    term: "Gain estimé",
    category: "Taux, rendement & scoring",
    definition:
      "Montant que vous recevriez en plus de votre capital si l'opération se déroule comme prévu, calculé à partir du taux proposé. Une estimation, pas une garantie.",
  },
  {
    id: "commission-plateforme",
    term: "Commission plateforme",
    category: "Taux, rendement & scoring",
    definition:
      "LeFinancier prélève 2% du montant financé côté PME et 3% des gains réellement perçus côté investisseur. Aucun frais si l'opération n'aboutit pas.",
  },
  {
    id: "score-risque",
    term: "Score de risque / Grade",
    category: "Taux, rendement & scoring",
    definition:
      "Note de A+ (risque très faible) à B (risque élevé) calculée automatiquement à partir des données financières et du profil de la PME. Plus le grade est élevé, plus le dossier est jugé fiable.",
  },
  {
    id: "confiance-scoring",
    term: "Confiance (scoring)",
    category: "Taux, rendement & scoring",
    definition:
      "Indique la fiabilité du score affiché, selon la quantité et la qualité des données disponibles sur l'entreprise. Une confiance faible signifie que le score repose sur peu d'informations.",
  },
  {
    id: "grade-plafonne",
    term: "Grade plafonné",
    category: "Taux, rendement & scoring",
    definition:
      "Le grade a été volontairement limité à cause d'un facteur de risque important (ex. incident de paiement connu), même si le score chiffré aurait pu être plus élevé.",
  },
  {
    id: "quotite-avance",
    term: "Quotité d'avance",
    category: "Taux, rendement & scoring",
    definition:
      "Pourcentage du montant d'une facture que la plateforme accepte de financer par avance ; le solde est versé une fois la facture réellement encaissée.",
  },
  {
    id: "couverture-garantie",
    term: "Couverture de garantie",
    category: "Taux, rendement & scoring",
    definition:
      "Rapport entre la valeur de la garantie proposée et le montant emprunté. Une couverture de 1,5× signifie que la garantie vaut 1,5 fois le montant du prêt.",
  },
  {
    id: "solvabilite-debiteur",
    term: "Solvabilité du débiteur",
    category: "Taux, rendement & scoring",
    definition:
      "Capacité du client final — celui qui doit payer la facture financée — à honorer ses paiements dans les délais.",
  },
  {
    id: "anciennete-relation",
    term: "Ancienneté de la relation commerciale",
    category: "Taux, rendement & scoring",
    definition:
      "Depuis combien de temps la PME travaille avec ce client. Une relation ancienne est généralement jugée plus fiable qu'une première transaction.",
  },
  {
    id: "taux-impayes",
    term: "Taux d'impayés",
    category: "Taux, rendement & scoring",
    definition:
      "Pourcentage des factures ou échéances qui n'ont pas été payées à temps sur une période donnée (généralement les 12 derniers mois).",
  },
  {
    id: "part-plus-gros-client",
    term: "Part du plus gros client",
    category: "Taux, rendement & scoring",
    definition:
      "Pourcentage du chiffre d'affaires qui dépend d'un seul client. Une part élevée signale un risque : la perte de ce client pèserait lourd sur l'activité.",
  },
  {
    id: "track-record",
    term: "Track record",
    category: "Taux, rendement & scoring",
    definition:
      "Historique et résultats passés du dirigeant dans son secteur, utilisés pour évaluer sa capacité à mener à bien le projet financé.",
  },
  {
    id: "scalabilite",
    term: "Scalabilité",
    category: "Taux, rendement & scoring",
    definition:
      "Capacité du modèle économique à générer beaucoup plus de revenus sans que les coûts augmentent dans les mêmes proportions.",
  },
  {
    id: "moat",
    term: "Avantage concurrentiel (moat)",
    category: "Taux, rendement & scoring",
    definition:
      "Ce qui protège durablement l'entreprise de la concurrence : marque forte, technologie propriétaire, réseau de distribution, coût de changement pour le client, etc.",
  },
  {
    id: "part-marche",
    term: "Position sur le marché",
    category: "Taux, rendement & scoring",
    definition:
      "Place de l'entreprise face à ses concurrents sur son marché : leader, challenger, suiveur ou acteur marginal.",
  },

  // ── Ratios financiers ─────────────────────────────────────────────────────
  {
    id: "dscr",
    term: "DSCR (ratio de couverture de la dette)",
    category: "Ratios financiers",
    definition:
      "Mesure si les revenus de l'entreprise suffisent à rembourser sa dette. Un DSCR de 1,5× signifie que le cash-flow disponible couvre 1,5 fois les échéances de la dette sur la période.",
  },
  {
    id: "autonomie-financiere",
    term: "Autonomie financière",
    category: "Ratios financiers",
    definition:
      "Fonds propres divisés par le total du bilan. Plus elle est élevée, moins l'entreprise dépend de dettes externes pour financer son activité.",
  },
  {
    id: "taux-endettement",
    term: "Taux d'endettement",
    category: "Ratios financiers",
    definition:
      "Part de la dette par rapport aux fonds propres ou au total du bilan. Un taux élevé signale une forte dépendance à l'emprunt.",
  },
  {
    id: "ratio-liquidite",
    term: "Ratio de liquidité",
    category: "Ratios financiers",
    definition:
      "Actifs disponibles à court terme divisés par les dettes à court terme. Mesure la capacité de l'entreprise à payer ses factures immédiates.",
  },
  {
    id: "marge-brute",
    term: "Marge brute",
    category: "Ratios financiers",
    definition:
      "Part du chiffre d'affaires qui reste après avoir déduit le coût direct des produits ou services vendus, avant les autres charges de l'entreprise.",
  },
  {
    id: "tcam",
    term: "TCAM (taux de croissance annuel moyen)",
    category: "Ratios financiers",
    definition:
      "Rythme moyen de croissance du chiffre d'affaires sur plusieurs années, exprimé en pourcentage par an.",
  },
  {
    id: "runway",
    term: "Runway",
    category: "Ratios financiers",
    definition:
      "Nombre de mois restants avant que la trésorerie de l'entreprise ne soit épuisée, au rythme de dépense actuel, sans nouveau financement.",
  },
  {
    id: "cash-flow",
    term: "Cash-flow (flux de trésorerie)",
    category: "Ratios financiers",
    definition:
      "Argent qui entre et sort réellement de l'entreprise sur une période donnée — distinct du chiffre d'affaires ou du bénéfice comptable.",
  },

  // ── Garanties ─────────────────────────────────────────────────────────────
  {
    id: "nantissement",
    term: "Nantissement",
    category: "Garanties",
    definition:
      "Garantie par laquelle un bien (compte, matériel) est affecté au remboursement du prêt, sans que l'emprunteur en perde l'usage — sauf en cas de défaut de paiement.",
  },
  {
    id: "hypotheque",
    term: "Hypothèque",
    category: "Garanties",
    definition:
      "Garantie prise sur un bien immobilier, qui permet au prêteur de le faire saisir et vendre si l'emprunteur ne rembourse pas.",
  },
  {
    id: "caution",
    term: "Caution personnelle / morale",
    category: "Garanties",
    definition:
      "Engagement d'une personne physique (caution personnelle) ou d'une autre société (caution morale) à rembourser la dette si l'emprunteur ne le peut pas.",
  },

  // ── Vérification & conformité ────────────────────────────────────────────
  {
    id: "kyc",
    term: "KYC (Know Your Customer)",
    category: "Vérification & conformité",
    definition:
      "Vérification d'identité obligatoire (pièce d'identité, documents légaux) avant d'accéder pleinement à la plateforme, pour prévenir la fraude.",
  },
  {
    id: "aml-lab-cft",
    term: "AML / LAB-CFT",
    category: "Vérification & conformité",
    definition:
      "Lutte Anti-Blanchiment et Contre le Financement du Terrorisme : ensemble de contrôles réglementaires appliqués à chaque transaction pour détecter les mouvements d'argent suspects.",
  },
  {
    id: "pep",
    term: "PEP (Personne Politiquement Exposée)",
    category: "Vérification & conformité",
    definition:
      "Personne occupant ou ayant occupé une fonction publique importante (ministre, haut fonctionnaire, etc.), soumise à une vigilance renforcée dans les vérifications réglementaires.",
  },

  // ── Fonctionnement de la plateforme ──────────────────────────────────────
  {
    id: "escrow",
    term: "Escrow (séquestre)",
    category: "Fonctionnement de la plateforme",
    definition:
      "Compte intermédiaire sécurisé qui retient les fonds d'un investisseur jusqu'à ce que l'opération soit validée par la plateforme, avant leur versement définitif à la PME.",
  },
  {
    id: "decaissement",
    term: "Décaissement",
    category: "Fonctionnement de la plateforme",
    definition:
      "Versement effectif des fonds à la PME, une fois l'offre acceptée par les deux parties et les vérifications de la plateforme validées.",
  },
  {
    id: "capital-investi",
    term: "Capital investi / déployé",
    category: "Fonctionnement de la plateforme",
    definition:
      "Montant total que vous avez effectivement versé dans des opportunités financées sur la plateforme.",
  },
  {
    id: "engagement",
    term: "Engagement",
    category: "Fonctionnement de la plateforme",
    definition:
      "Promesse ferme d'investir un montant donné dans une opportunité, formalisée après acceptation d'une offre par la PME et l'investisseur.",
  },
  {
    id: "negociation",
    term: "Négociation / Contre-offre",
    category: "Fonctionnement de la plateforme",
    definition:
      "Échange entre la PME et l'investisseur pour ajuster le taux ou les conditions d'une offre avant de conclure un accord définitif.",
  },
  {
    id: "watchlist",
    term: "Favoris (watchlist)",
    category: "Fonctionnement de la plateforme",
    definition:
      "Liste des opportunités que vous suivez de près sans y être encore engagé financièrement, pour les retrouver facilement.",
  },
];

export function glossaryText(id: string): string {
  return GLOSSARY.find((g) => g.id === id)?.definition ?? "";
}

export function glossaryByCategory(): { category: string; terms: GlossaryTerm[] }[] {
  return GLOSSARY_CATEGORIES.map((category) => ({
    category,
    terms: GLOSSARY.filter((t) => t.category === category),
  })).filter((g) => g.terms.length > 0);
}
