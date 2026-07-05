import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// Hash bcrypt pré-calculé pour "Demo1234!" (mot de passe des comptes analystes de démo)
const DEMO_PASSWORD_HASH = '$2b$12$kmQ4Djdr0ybrI0yL9YlwHO2IbN/v56JkIJtLXTm1CF/neYtJP4L/a';

async function ensureInstitutionTeam(ownerId: string) {
  let institutionRecord = await prisma.institution.findFirst({
    where: { members: { some: { userId: ownerId } } },
  });

  if (!institutionRecord) {
    institutionRecord = await prisma.institution.create({
      data: {
        name: 'Banque Atlantique CI',
        type: 'Banque commerciale',
        bceaoApprovalNumber: 'CI-B-2010-001',
        country: 'CI',
        address: 'Plateau, Avenue Botreau Roussel',
        contactEmail: 'contact@banque-atlantique.ci',
        contactPhone: '+225 20 20 20 20',
        envelopeMax: 1_000_000_000,
        ticketMin: 25_000_000,
        ticketMax: 500_000_000,
        excludedSectors: ['Tabac', 'Armement', 'Jeux', 'Alcool'],
        members: {
          create: { userId: ownerId, role: 'OWNER', status: 'ACTIVE' },
        },
      },
    });
    console.log('Institution créée : Banque Atlantique CI');
  }

  const teammates = [
    { email: 'k.assoumou@banque-atlantique.ci', firstName: 'Kouamé', lastName: 'Assoumou', role: 'ANALYST' as const, specialty: 'Affacturage & Prêts' },
    { email: 'm.toure@banque-atlantique.ci', firstName: 'Mariame', lastName: 'Touré', role: 'ANALYST' as const, specialty: 'Prêts MLT & Equity' },
    { email: 's.bamba@banque-atlantique.ci', firstName: 'Serge', lastName: 'Bamba', role: 'COMPLIANCE' as const, specialty: 'Conformité & AML' },
  ];

  const teammateIds: Record<string, string> = {};

  for (const teammate of teammates) {
    let user = await prisma.user.findUnique({ where: { email: teammate.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: teammate.email,
          passwordHash: DEMO_PASSWORD_HASH,
          firstName: teammate.firstName,
          lastName: teammate.lastName,
          role: 'INSTITUTION',
          kycStatus: 'VERIFIED',
        },
      });
      await prisma.institutionMember.create({
        data: {
          userId: user.id,
          institutionId: institutionRecord.id,
          role: teammate.role,
          specialty: teammate.specialty,
        },
      });
      console.log(`Coéquipier créé : ${teammate.firstName} ${teammate.lastName}`);
    }
    teammateIds[teammate.email] = user.id;
  }

  return { institutionId: institutionRecord.id, teammateIds };
}

async function ensureAmlAlerts(institutionId: string) {
  const existingCount = await prisma.amlAlert.count({ where: { institutionId } });
  if (existingCount > 0) {
    console.log('Alertes AML déjà seedées, ignoré.');
    return;
  }

  const kawa = await prisma.organization.findUnique({ where: { registrationNumber: 'CI-ABJ-2024-B-9001' } });
  const freshni = await prisma.organization.findUnique({ where: { registrationNumber: 'CI-ABJ-2024-B-9003' } });
  const solarTech = await prisma.organization.findUnique({ where: { registrationNumber: 'CI-ABJ-2024-B-9005' } });

  await prisma.amlAlert.createMany({
    data: [
      {
        institutionId,
        organizationId: kawa?.id ?? null,
        clientLabel: 'KAWA Services',
        alertType: 'TRANSACTION_INHABITUELLE',
        amount: 45_000_000,
        status: 'EN_ANALYSE',
        detectedAt: daysAgo(23),
      },
      {
        institutionId,
        organizationId: null,
        clientLabel: 'Nouveau client',
        alertType: 'PEP_DETECTE',
        amount: null,
        status: 'BLOQUE',
        detectedAt: daysAgo(24),
      },
      {
        institutionId,
        organizationId: freshni?.id ?? null,
        clientLabel: 'FRESHNI',
        alertType: 'BENEFICIAIRE_NON_IDENTIFIE',
        amount: 12_000_000,
        status: 'RESOLU',
        detectedAt: daysAgo(26),
        resolvedAt: daysAgo(3),
      },
      {
        institutionId,
        organizationId: solarTech?.id ?? null,
        clientLabel: 'SolarTech Abidjan',
        alertType: 'TRANSACTION_INHABITUELLE',
        amount: 30_000_000,
        status: 'RESOLU',
        detectedAt: daysAgo(15),
        resolvedAt: daysAgo(1),
      },
    ],
  });
  console.log('Alertes AML créées (4).');
}

async function main() {
  const institution = await prisma.user.findUnique({
    where: { email: 'banque@lefinancier.ci' },
  });
  if (!institution) {
    throw new Error(
      "Utilisateur banque@lefinancier.ci introuvable — ce seed suppose que le compte de test institution existe déjà.",
    );
  }

  const { institutionId, teammateIds } = await ensureInstitutionTeam(institution.id);

  const deals = [
    {
      legalName: 'KAWA Services',
      registrationNumber: 'CI-ABJ-2024-B-9001',
      sector: 'Services B2B',
      city: 'Abidjan',
      title: 'Rachat de factures clients grands comptes',
      description:
        'Rachat de 3 factures clients grands comptes (SGBCI, Orange CI). Taux de récurrence élevé.',
      category: 'FACTURE' as const,
      amountRequested: 120_000_000,
      durationMonths: 3,
      expectedReturn: 8.5,
      createdAt: daysAgo(25),
      score: 82,
      grade: 'A',
      investment: { amountCommitted: 80_000_000, lockedReturn: 8.5, investorEmail: 'k.assoumou@banque-atlantique.ci' },
    },
    {
      legalName: 'AGRO MORONOU',
      registrationNumber: 'CI-ABJ-2024-B-9002',
      sector: 'Agriculture',
      city: 'Aboisso',
      title: 'Financement campagne cacaoière 2026-2027',
      description:
        'Financement de la campagne cacaoière 2026-2027. Garantie OHADA + nantissement stock.',
      category: 'PRET' as const,
      amountRequested: 500_000_000,
      durationMonths: 24,
      expectedReturn: 11,
      createdAt: daysAgo(210),
      score: 88,
      grade: 'A+',
      investment: { amountCommitted: 300_000_000, lockedReturn: 11, investorEmail: 'banque@lefinancier.ci' },
    },
    {
      legalName: 'FRESHNI',
      registrationNumber: 'CI-ABJ-2024-B-9003',
      sector: 'Agroalimentaire',
      city: 'Abidjan',
      title: 'Factures grande distribution',
      description:
        "Factures de livraison à la grande distribution (SOCOCE, PlaYce). Délai de paiement 60j.",
      category: 'FACTURE' as const,
      amountRequested: 75_000_000,
      durationMonths: 2,
      expectedReturn: 7.8,
      createdAt: daysAgo(20),
      score: 79,
      grade: 'A',
      investment: { amountCommitted: 45_000_000, lockedReturn: 7.8, investorEmail: 'm.toure@banque-atlantique.ci' },
    },
    {
      legalName: 'LogiTrans CI',
      registrationNumber: 'CI-ABJ-2024-B-9004',
      sector: 'Transport & Logistique',
      city: 'Abidjan',
      title: 'Participation minoritaire holding logistique régionale',
      description:
        'Participation minoritaire (12%) dans une holding logistique en expansion régionale (5 pays CEDEAO).',
      category: 'EQUITY' as const,
      amountRequested: 250_000_000,
      durationMonths: 36,
      expectedReturn: 15,
      createdAt: daysAgo(60),
      score: 48,
      grade: 'BB',
      investment: { amountCommitted: 150_000_000, lockedReturn: 15, investorEmail: 'banque@lefinancier.ci' },
    },
    {
      legalName: 'SolarTech Abidjan',
      registrationNumber: 'CI-ABJ-2024-B-9005',
      sector: 'Énergie',
      city: 'Abidjan',
      title: 'Financement kits solaires PME industrielles',
      description:
        'Financement de 200 installations solaires pour les PME industrielles. Subvention partielle CIE.',
      category: 'PRET' as const,
      amountRequested: 180_000_000,
      durationMonths: 18,
      expectedReturn: 9.2,
      createdAt: daysAgo(3),
      score: 60,
      grade: 'BBB',
      investment: { amountCommitted: 120_000_000, lockedReturn: 9.2, investorEmail: 'k.assoumou@banque-atlantique.ci' },
    },
    {
      legalName: 'Pharmacie Du Golfe',
      registrationNumber: 'CI-ABJ-2024-B-9006',
      sector: 'Santé',
      city: 'Abidjan',
      title: 'Factures CNAM et mutuelles',
      description:
        'Factures CNAM et mutuelles d\'entreprise. Secteur réglementé à faible risque de défaut.',
      category: 'FACTURE' as const,
      amountRequested: 55_000_000,
      durationMonths: 1,
      expectedReturn: 8,
      createdAt: daysAgo(30),
      score: 90,
      grade: 'A+',
      investment: null,
    },
  ];

  for (const deal of deals) {
    const existing = await prisma.organization.findUnique({
      where: { registrationNumber: deal.registrationNumber },
    });
    if (existing) {
      console.log(`Déjà seedé, ignoré : ${deal.legalName}`);
      continue;
    }

    const organization = await prisma.organization.create({
      data: {
        legalName: deal.legalName,
        registrationNumber: deal.registrationNumber,
        sector: deal.sector,
        city: deal.city,
        country: 'CI',
        verificationStatus: 'VERIFIED',
      },
    });

    const amountRaised = deal.investment?.amountCommitted ?? Math.round(deal.amountRequested * 0.1);

    const fundingRequest = await prisma.fundingRequest.create({
      data: {
        organizationId: organization.id,
        title: deal.title,
        description: deal.description,
        category: deal.category,
        amountRequested: deal.amountRequested,
        amountRaised,
        expectedReturn: deal.expectedReturn,
        durationMonths: deal.durationMonths,
        status: 'PUBLISHED',
        publishedAt: deal.createdAt,
        createdAt: deal.createdAt,
      },
    });

    await prisma.scoringReport.create({
      data: {
        organizationId: organization.id,
        fundingRequestId: fundingRequest.id,
        product: deal.category,
        autoScore: deal.score,
        grade: deal.grade,
        coverage: 0.9,
        confidence: 0.85,
        kpiSnapshot: {},
        status: 'CALCULATED',
        createdAt: deal.createdAt,
      },
    });

    if (deal.investment) {
      const investorId = teammateIds[deal.investment.investorEmail] ?? institution.id;

      await prisma.investment.create({
        data: {
          fundingRequestId: fundingRequest.id,
          investorId,
          amountCommitted: deal.investment.amountCommitted,
          lockedReturn: deal.investment.lockedReturn,
          status: 'COMMITTED',
          createdAt: deal.createdAt,
        },
      });
    }

    console.log(`Créé : ${deal.legalName}`);
  }

  await ensureAmlAlerts(institutionId);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
