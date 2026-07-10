import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
// Réutilisation directe du moteur de scoring et du générateur d'échéancier réels
// (fonctions pures, sans dépendance) pour que les données de seed soient calculées
// avec exactement le même algorithme que la production — jamais de score inventé à la main.
import { scoreFacture, scorePret, scoreEquity } from '../../../apps/backend/src/scoring/scoring.engine';
import { generateSchedule } from '../../../apps/backend/src/repayment/repayment-schedule.generator';
import {
  ORGANIZATIONS, FUNDING_REQUESTS, INSTITUTIONS, INDEPENDENT_INVESTORS,
  mulberry32, pick, range, rangeInt, buildCreditProfile, buildDebtorProfile, buildGarantieProfile,
  personName, emailSlug, Tier, Category,
} from './seed-data';

const prisma = new PrismaClient();

// Comptes de test de la page de login (apps/frontend/src/app/login/page.tsx) — hashs inchangés.
const TEST_ACCOUNT_PASSWORD_HASH = '$2b$12$D.tHR8uV6ByF5lA2/Cf5FuanqaQ0e2oi3TuDvm9MJ2SkGE7DxVoOi'; // motdepasse123
const ADMIN_PASSWORD_HASH = '$2b$12$jmyaA50dIrXmvJl0doNNoOD2RnQzk64fJePPMipSahIiQ6O3KQbti'; // admin123456
const DEMO_PASSWORD_HASH = '$2b$12$kmQ4Djdr0ybrI0yL9YlwHO2IbN/v56JkIJtLXTm1CF/neYtJP4L/a'; // Demo1234! — tous les autres comptes seedés

const now = new Date();
function daysAgo(days: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
}
function num(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}
function civPhone(rng: () => number): string {
  const prefix = pick(rng, ['01', '05', '07', '25']);
  const rest = Array.from({ length: 4 }, () => rangeInt(rng, 10, 99)).join(' ');
  return `+225 ${prefix} ${rest}`;
}

const TYPE_FOLDERS: Record<string, string> = {
  KYC_ID: 'kyc-identite',
  KYC_PROOF_OF_ADDRESS: 'kyc-justificatif-domicile',
  ORGANIZATION_LEGAL: 'documents-juridiques',
  FINANCIAL_STATEMENT: 'etats-financiers',
  FUNDING_REQUEST_ATTACHMENT: 'pieces-jointes',
  SETTLEMENT_PROOF: 'preuves-reglement',
  DISPUTE_EVIDENCE: 'preuves-litige',
  OTHER: 'autres',
};
function storageKey(type: string, ctx: { organizationId?: string; fundingRequestId?: string }): string {
  const folder = TYPE_FOLDERS[type] ?? 'autres';
  if (ctx.organizationId) return `organisations/${ctx.organizationId}/${folder}/${randomUUID()}.pdf`;
  if (ctx.fundingRequestId) return `demandes/${ctx.fundingRequestId}/${folder}/${randomUUID()}.pdf`;
  return `fichiers/${folder}/${randomUUID()}.pdf`;
}

// ── Notifications & audit log ───────────────────────────────────────────────────

async function notify(userId: string, title: string, body: string, createdAt: Date, read = false) {
  await prisma.notification.create({
    data: { userId, title, body, channel: 'IN_APP', createdAt, readAt: read ? daysAgo(0) : null },
  });
}
async function audit(userId: string | null, action: string, entityType: string, entityId: string, createdAt: Date, metadata?: Record<string, unknown>) {
  await prisma.auditLog.create({ data: { userId, action, entityType, entityId, metadata: metadata as any, createdAt } });
}

// ── Utilisateurs ─────────────────────────────────────────────────────────────────

interface EnsureUserInput {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  passwordHash: string;
  kycStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  phone?: string;
}
async function ensureUser(input: EnsureUserInput) {
  let user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role as any,
        kycStatus: (input.kycStatus ?? 'VERIFIED') as any,
        phone: input.phone,
      },
    });
  }
  return user;
}

// ── Institutions & équipes ───────────────────────────────────────────────────────

interface InstitutionCtx { id: string; ticketMin: number; ticketMax: number; memberIds: string[]; ownerId: string; }
const institutionCtx: Record<string, InstitutionCtx> = {};

async function ensureInstitutions() {
  for (let i = 0; i < INSTITUTIONS.length; i++) {
    const spec = INSTITUTIONS[i];
    const rng = mulberry32(1000 + i);
    let institution = await prisma.institution.findFirst({ where: { name: spec.name } });
    if (!institution) {
      institution = await prisma.institution.create({
        data: {
          name: spec.name,
          type: spec.type,
          bceaoApprovalNumber: spec.bceaoApprovalNumber,
          country: 'CI',
          address: spec.city,
          contactEmail: `contact@${emailSlug(spec.name)}.ci`,
          contactPhone: civPhone(rng),
          envelopeMax: spec.envelopeMax,
          ticketMin: spec.ticketMin,
          ticketMax: spec.ticketMax,
          excludedSectors: spec.excludedSectors,
        },
      });
    }

    const memberIds: string[] = [];
    let ownerId = '';

    if (spec.ownerTestEmail) {
      const owner = await ensureUser({
        email: spec.ownerTestEmail, firstName: 'Banque', lastName: 'Atlantique',
        role: 'INSTITUTION', passwordHash: TEST_ACCOUNT_PASSWORD_HASH, kycStatus: 'VERIFIED',
        phone: civPhone(rng),
      });
      ownerId = owner.id;
      const existing = await prisma.institutionMember.findUnique({ where: { userId: owner.id } });
      if (!existing) {
        await prisma.institutionMember.create({ data: { userId: owner.id, institutionId: institution.id, role: 'OWNER', status: 'ACTIVE' } });
      }
      memberIds.push(owner.id);
    }

    for (const m of spec.members) {
      const user = await ensureUser({
        email: m.email, firstName: m.firstName, lastName: m.lastName,
        role: 'INSTITUTION', passwordHash: DEMO_PASSWORD_HASH, kycStatus: m.kycStatus, phone: civPhone(rng),
      });
      if (m.role === 'OWNER') ownerId = user.id;
      const existing = await prisma.institutionMember.findUnique({ where: { userId: user.id } });
      if (!existing) {
        await prisma.institutionMember.create({
          data: { userId: user.id, institutionId: institution.id, role: m.role, status: m.status, specialty: m.specialty },
        });
      }
      memberIds.push(user.id);
    }

    institutionCtx[spec.name] = { id: institution.id, ticketMin: spec.ticketMin, ticketMax: spec.ticketMax, memberIds, ownerId };
  }
}

// ── Organisations & profil de crédit ────────────────────────────────────────────

interface OrgCtx { organizationId: string; ownerId: string; memberIds: string[]; tier: Tier; verificationStatus: string; }
const orgCtx: Record<string, OrgCtx> = {};

async function ensureOrganizations(testPmeOwnerId: string, adminId: string) {
  for (let i = 0; i < ORGANIZATIONS.length; i++) {
    const spec = ORGANIZATIONS[i];
    const rng = mulberry32(2000 + i);

    let organization = await prisma.organization.findUnique({ where: { registrationNumber: spec.registrationNumber } });
    if (organization) {
      const ownerMember = await prisma.organizationMember.findFirst({ where: { organizationId: organization.id, role: 'OWNER' } });
      orgCtx[spec.registrationNumber] = {
        organizationId: organization.id, ownerId: ownerMember!.userId, memberIds: [ownerMember!.userId],
        tier: spec.tier, verificationStatus: spec.verificationStatus,
      };
      continue;
    }

    const profile = buildCreditProfile(spec.tier, spec.sizeFactor, spec.verificationStatus, rng);

    let ownerId: string;
    if (spec.isTestPmeOrg) {
      ownerId = testPmeOwnerId;
    } else {
      const owner = personName(rng);
      const domain = emailSlug(spec.legalName);
      const user = await ensureUser({
        email: `${emailSlug(owner.firstName)}.${emailSlug(owner.lastName)}@${domain}.ci`,
        firstName: owner.firstName, lastName: owner.lastName, role: 'PME_OWNER', passwordHash: DEMO_PASSWORD_HASH,
        kycStatus: spec.verificationStatus === 'VERIFIED' ? 'VERIFIED' : 'PENDING', phone: civPhone(rng),
      });
      ownerId = user.id;
    }

    // L'organisation doit précéder sur la plateforme toutes ses propres demandes de
    // financement : on ancre sa date de création avant la plus ancienne d'entre elles.
    const oldestRequestDaysAgo = Math.max(0, ...FUNDING_REQUESTS.filter((f) => f.registrationNumber === spec.registrationNumber).map((f) => f.createdDaysAgo));
    const orgCreatedAt = daysAgo(oldestRequestDaysAgo + rangeInt(rng, 30, 90));

    organization = await prisma.organization.create({
      data: {
        legalName: spec.legalName, registrationNumber: spec.registrationNumber, sector: spec.sector,
        city: spec.city, country: 'CI', foundedYear: spec.foundedYear, legalForm: spec.legalForm,
        verificationStatus: spec.verificationStatus as any, rejectionReason: spec.rejectionReason,
        createdAt: orgCreatedAt,
        ...profile,
      },
    });
    await prisma.organizationMember.create({ data: { organizationId: organization.id, userId: ownerId, role: 'OWNER', createdAt: orgCreatedAt } });

    const memberIds = [ownerId];
    if (!spec.isTestPmeOrg && i % 3 === 0) {
      const co = personName(mulberry32(9000 + i));
      const domain = emailSlug(spec.legalName);
      const member = await ensureUser({
        email: `${emailSlug(co.firstName)}.${emailSlug(co.lastName)}@${domain}.ci`,
        firstName: co.firstName, lastName: co.lastName, role: 'PME_MEMBER', passwordHash: DEMO_PASSWORD_HASH,
        kycStatus: 'VERIFIED', phone: civPhone(rng),
      });
      await prisma.organizationMember.create({ data: { organizationId: organization.id, userId: member.id, role: 'MEMBER', createdAt: orgCreatedAt } });
      memberIds.push(member.id);
    }

    orgCtx[spec.registrationNumber] = {
      organizationId: organization.id, ownerId, memberIds, tier: spec.tier, verificationStatus: spec.verificationStatus,
    };

    const reviewedAt = daysAgo(oldestRequestDaysAgo + rangeInt(rng, 5, 25));
    if (spec.verificationStatus === 'VERIFIED') {
      await audit(adminId, 'ORGANIZATION_VERIFIED', 'Organization', organization.id, reviewedAt);
    } else if (spec.verificationStatus === 'REJECTED') {
      await audit(adminId, 'ORGANIZATION_REJECTED', 'Organization', organization.id, reviewedAt, { reason: spec.rejectionReason });
      await notify(ownerId, 'Dossier PME rejeté', `Votre organisation "${spec.legalName}" n'a pas été validée : ${spec.rejectionReason}`, reviewedAt);
    }
  }
}

// ── Demandes de financement, ScoringInput & ScoringReport ──────────────────────

interface FundingCtx {
  id: string; registrationNumber: string; category: Category; status: string;
  amountRequested: number; durationMonths: number; expectedReturn: number;
  tier: Tier; organizationId: string; ownerId: string; createdAt: Date; title: string;
}
const fundingCtx: FundingCtx[] = [];

async function ensureFundingRequestsAndScoring(adminId: string) {
  for (let i = 0; i < FUNDING_REQUESTS.length; i++) {
    const spec = FUNDING_REQUESTS[i];
    const org = orgCtx[spec.registrationNumber];
    const rng = mulberry32(5000 + i);
    const createdAt = daysAgo(spec.createdDaysAgo);

    let fr = await prisma.fundingRequest.findFirst({ where: { organizationId: org.organizationId, title: spec.title } });
    if (fr) {
      fundingCtx.push({
        id: fr.id, registrationNumber: spec.registrationNumber, category: spec.category, status: fr.status,
        amountRequested: Number(fr.amountRequested), durationMonths: spec.durationMonths, expectedReturn: spec.expectedReturn,
        tier: org.tier, organizationId: org.organizationId, ownerId: org.ownerId, createdAt: fr.createdAt, title: spec.title,
      });
      continue;
    }

    const isLive = ['PUBLISHED', 'FUNDED', 'CLOSED'].includes(spec.status);
    const closesAt = spec.status === 'CLOSED' ? daysAgo(Math.max(spec.createdDaysAgo - spec.durationMonths * 30 - 15, 1)) : null;

    fr = await prisma.fundingRequest.create({
      data: {
        organizationId: org.organizationId, title: spec.title, description: spec.description,
        category: spec.category as any, amountRequested: spec.amountRequested, durationMonths: spec.durationMonths,
        expectedReturn: spec.expectedReturn, status: spec.status as any, rejectionReason: spec.rejectionReason,
        publishedAt: isLive ? createdAt : null, closesAt, scoringError: spec.forceScoringError ?? null,
        createdAt, updatedAt: createdAt,
      },
    });

    if (spec.category !== 'EQUITY') {
      const scoringFields = spec.category === 'FACTURE' ? buildDebtorProfile(org.tier, rng) : buildGarantieProfile(org.tier, rng);
      await prisma.scoringInput.create({
        data: { fundingRequestId: fr.id, product: spec.category, ...scoringFields, createdAt },
      });
    }

    if (spec.status !== 'DRAFT' && !spec.skipScoring && !spec.forceScoringError) {
      const organization = await prisma.organization.findUnique({ where: { id: org.organizationId } });
      const scoringInput = await prisma.scoringInput.findUnique({ where: { fundingRequestId: fr.id } });

      let result;
      if (spec.category === 'FACTURE') {
        result = scoreFacture({
          debiteurType: scoringInput?.debiteurType ?? null,
          debiteurSolvabilite: scoringInput?.debiteurSolvabilite ?? null,
          ancienneteRelation: scoringInput?.ancienneteRelation ?? null,
          delaiPaiementMenu: scoringInput?.delaiPaiementMenu ?? null,
          tauxImpaye12m: num(scoringInput?.tauxImpaye12m),
          partPlusGrosClient: num(scoringInput?.partPlusGrosClient),
          nbClientsActifs: organization?.nbClientsActifs ?? null,
        });
      } else if (spec.category === 'PRET') {
        result = scorePret({
          cashFlowAnnuel: num(organization?.cashFlowAnnuel),
          fluxMobileMoneyMensuel: num(organization?.fluxMobileMoneyMensuel),
          autonomieFinanciere: num(organization?.autonomieFinanciere),
          tauxEndettement: num(organization?.tauxEndettement),
          ratioLiquidite: num(organization?.ratioLiquidite),
          garantieType: scoringInput?.garantieType ?? null,
          garantieCouverture: num(scoringInput?.garantieCouverture),
          dirigeantExperienceAns: organization?.dirigeantExperienceAns ?? null,
          dirigeantAntecedents: organization?.dirigeantAntecedents ?? null,
          dirigeantIncidentsLegaux: organization?.dirigeantIncidentsLegaux ?? null,
          secteurCode: organization?.secteurCode ?? null,
          secteurSaisonnalite: organization?.secteurSaisonnalite ?? null,
          secteurImportDevises: organization?.secteurImportDevises ?? null,
          secteurSoutienPublic: organization?.secteurSoutienPublic ?? null,
          amountRequested: spec.amountRequested,
          durationMonths: spec.durationMonths,
        });
      } else {
        result = scoreEquity({
          tcamCa3ans: num(organization?.tcamCa3ans),
          tailleMarche: organization?.tailleMarche ?? null,
          scalabilite: organization?.scalabilite ?? null,
          experienceSecteurAns: organization?.experienceSecteurAns ?? null,
          trackRecord: organization?.trackRecord ?? null,
          completudeEquipe: organization?.completudeEquipe ?? null,
          moat: organization?.moat ?? null,
          partMarcheRelative: organization?.partMarcheRelative ?? null,
          runwayMois: organization?.runwayMois ?? null,
          margeBrute: num(organization?.margeBrute),
          droitsInvestisseur: organization?.droitsInvestisseur ?? null,
          transparence: organization?.transparence ?? null,
        });
      }

      const shouldValidate = rng() < 0.6 && spec.status !== 'REJECTED';
      const report = await prisma.scoringReport.create({
        data: {
          organizationId: org.organizationId, fundingRequestId: fr.id, product: spec.category,
          autoScore: result.autoScore, grade: result.grade, gradeCapped: result.gradeCapped,
          coverage: result.coverage, confidence: result.confidence, advanceRate: result.advanceRate ?? undefined,
          kpiSnapshot: result.kpiSnapshot as any,
          status: shouldValidate ? 'VALIDATED' : 'CALCULATED',
          validatedById: shouldValidate ? adminId : undefined,
          validatedScore: shouldValidate ? result.autoScore : undefined,
          validationNotes: shouldValidate ? 'Analyse conforme au barème 2026.1, aucune réserve.' : undefined,
          validatedAt: shouldValidate ? daysAgo(Math.max(spec.createdDaysAgo - 1, 0)) : undefined,
          createdAt,
        },
      });
      if (shouldValidate) await audit(adminId, 'SCORING_REPORT_VALIDATED', 'ScoringReport', report.id, daysAgo(Math.max(spec.createdDaysAgo - 1, 0)));
    }

    fundingCtx.push({
      id: fr.id, registrationNumber: spec.registrationNumber, category: spec.category, status: spec.status,
      amountRequested: spec.amountRequested, durationMonths: spec.durationMonths, expectedReturn: spec.expectedReturn,
      tier: org.tier, organizationId: org.organizationId, ownerId: org.ownerId, createdAt, title: spec.title,
    });

    if (spec.status !== 'DRAFT') await audit(org.ownerId, 'FUNDING_REQUEST_SUBMITTED', 'FundingRequest', fr.id, createdAt);
    if (isLive) await audit(adminId, 'FUNDING_REQUEST_PUBLISHED', 'FundingRequest', fr.id, createdAt);
    if (spec.status === 'REJECTED') await audit(adminId, 'FUNDING_REQUEST_REJECTED', 'FundingRequest', fr.id, createdAt, { reason: spec.rejectionReason });
    if (spec.status === 'CANCELLED') await audit(org.ownerId, 'FUNDING_REQUEST_CANCELLED', 'FundingRequest', fr.id, createdAt);
    if (isLive) await notify(org.ownerId, 'Votre demande a été publiée', `"${spec.title}" est maintenant visible par les investisseurs.`, createdAt);
    if (spec.status === 'REJECTED') await notify(org.ownerId, 'Demande rejetée', `"${spec.title}" a été rejetée : ${spec.rejectionReason}`, createdAt);
  }
}

// ── Négociations ─────────────────────────────────────────────────────────────────

type Round = { proposedBy: 'INVESTOR' | 'PME'; proposedReturn: number; status: 'PENDING' | 'ACCEPTED' | 'COUNTERED' };

function roundsAwaitingPme(rng: () => number, base: number): Round[] {
  return [{ proposedBy: 'INVESTOR', proposedReturn: Number(range(rng, base - 0.5, base + 0.5).toFixed(2)), status: 'PENDING' }];
}
function roundsAwaitingInvestor(rng: () => number, base: number): Round[] {
  const first = Number(range(rng, base - 0.5, base + 1).toFixed(2));
  const second = Number((first - range(rng, 0.3, 0.8)).toFixed(2));
  return [
    { proposedBy: 'INVESTOR', proposedReturn: first, status: 'COUNTERED' },
    { proposedBy: 'PME', proposedReturn: second, status: 'PENDING' },
  ];
}
function roundsAccepted(rng: () => number, base: number): { rounds: Round[]; lockedReturn: number } {
  const n = rangeInt(rng, 1, 2);
  const rounds: Round[] = [];
  let proposer: 'INVESTOR' | 'PME' = 'INVESTOR';
  let val = Number(range(rng, base - 0.4, base + 0.4).toFixed(2));
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    rounds.push({ proposedBy: proposer, proposedReturn: val, status: isLast ? 'ACCEPTED' : 'COUNTERED' });
    proposer = proposer === 'INVESTOR' ? 'PME' : 'INVESTOR';
    val = Number((val - range(rng, 0.2, 0.5)).toFixed(2));
  }
  return { rounds, lockedReturn: rounds[rounds.length - 1].proposedReturn };
}

async function createInvestment(params: {
  fr: FundingCtx; investorId: string; amount: number; status: 'INTERESTED' | 'NEGOTIATING' | 'COMMITTED' | 'SETTLED_OFF_PLATFORM' | 'CANCELLED' | 'REJECTED';
  rounds?: Round[]; lockedReturn?: number; createdAt: Date;
}) {
  const { fr, investorId, amount, status, rounds, lockedReturn, createdAt } = params;
  const investment = await prisma.investment.create({
    data: {
      fundingRequestId: fr.id, investorId, amountCommitted: amount, status, lockedReturn: lockedReturn ?? null, createdAt, updatedAt: createdAt,
    },
  });
  if (rounds) {
    let offerDate = createdAt;
    for (const round of rounds) {
      await prisma.negotiationOffer.create({
        data: { investmentId: investment.id, proposedBy: round.proposedBy, proposedReturn: round.proposedReturn, status: round.status, createdAt: offerDate },
      });
      offerDate = new Date(offerDate.getTime() + 24 * 3600 * 1000);
    }
  }
  return investment;
}

let overdueUsed = false;

async function settleInvestment(fr: FundingCtx, investment: { id: string; amountCommitted: any; lockedReturn: any; investorId: string }, settledAt: Date, fullyPaid: boolean) {
  await prisma.investment.update({ where: { id: investment.id }, data: { status: 'SETTLED_OFF_PLATFORM', settledAt } });

  const amountCommitted = Number(investment.amountCommitted);
  const lockedReturn = Number(investment.lockedReturn);

  const doc = await prisma.document.create({
    data: {
      type: 'SETTLEMENT_PROOF', storageKey: storageKey('SETTLEMENT_PROOF', { fundingRequestId: fr.id }),
      fileName: `preuve-reglement-${fr.id.slice(0, 8)}.pdf`, mimeType: 'application/pdf', sizeBytes: rangeInt(mulberry32(1), 80_000, 900_000),
      status: 'APPROVED', uploadedById: investment.investorId, fundingRequestId: fr.id, createdAt: settledAt, updatedAt: settledAt,
    },
  });
  await prisma.investment.update({ where: { id: investment.id }, data: { settlementProofId: doc.id } });

  await prisma.commission.create({
    data: {
      type: 'FUNDING_FEE', fundingRequestId: fr.id, baseAmount: amountCommitted, rate: 0.02,
      commissionAmount: amountCommitted * 0.02, status: 'COLLECTED', createdAt: settledAt,
    },
  });

  const entries = generateSchedule({
    investmentId: investment.id, fundingRequestId: fr.id, amountCommitted, lockedReturn,
    durationMonths: fr.durationMonths, category: fr.category, startDate: settledAt,
  });

  for (const entry of entries) {
    const isPast = entry.dueDate < now;
    const forceOverdue = isPast && !fullyPaid && !overdueUsed && rangeInt(mulberry32(entry.dueDate.getTime() % 1000), 0, 10) < 3;

    if (isPast && !forceOverdue) {
      const schedule = await prisma.repaymentSchedule.create({
        data: { ...entry, status: 'PAID' },
      });
      const paidAt = new Date(entry.dueDate.getTime() + 2 * 24 * 3600 * 1000);
      const payment = await prisma.repaymentPayment.create({
        data: { repaymentScheduleId: schedule.id, amountPaid: entry.amountDue, paidAt, confirmedById: investment.investorId, createdAt: paidAt },
      });
      if (entry.interestAmount > 0) {
        await prisma.commission.create({
          data: {
            type: 'INTEREST_FEE', fundingRequestId: fr.id, repaymentPaymentId: payment.id, baseAmount: entry.interestAmount,
            rate: 0.03, commissionAmount: entry.interestAmount * 0.03, status: 'COLLECTED', createdAt: paidAt,
          },
        });
      }
    } else if (forceOverdue) {
      await prisma.repaymentSchedule.create({ data: { ...entry, status: 'OVERDUE' } });
      overdueUsed = true;
    } else {
      await prisma.repaymentSchedule.create({ data: { ...entry, status: 'PENDING' } });
    }
  }
}

function pickInvestorPool(rng: () => number, amount: number, institutionIds: string[], independentIds: string[]): string {
  if (amount >= 150_000_000 || rng() < 0.55) return pick(rng, institutionIds);
  return pick(rng, independentIds);
}

const specialHandled = new Set<string>();

async function createInvestmentsAndRepayments(testInvestorId: string, testInstitutionOwnerId: string) {
  const institutionIds = Object.values(institutionCtx).flatMap((i) => i.memberIds);
  const independentIds = [testInvestorId, ...(await Promise.all(
    INDEPENDENT_INVESTORS.map((inv) => ensureUser({ email: inv.email, firstName: inv.firstName, lastName: inv.lastName, role: 'INVESTOR', passwordHash: DEMO_PASSWORD_HASH, kycStatus: inv.kycStatus })),
  )).map((u) => u.id)];

  const byTitle = (t: string) => fundingCtx.find((f) => f.title === t)!;

  // -- scénarios ciblés pour enrichir le tableau de bord des comptes de test --
  const kawaFactures = byTitle('Rachat de factures clients grands comptes');
  specialHandled.add(kawaFactures.id);
  await createInvestment({
    fr: kawaFactures, investorId: institutionCtx['Banque Atlantique CI'].memberIds[1],
    amount: 80_000_000, status: 'COMMITTED', lockedReturn: 8.5,
    rounds: [{ proposedBy: 'INVESTOR', proposedReturn: 8.5, status: 'ACCEPTED' }],
    createdAt: daysAgo(24),
  });
  await createInvestment({
    fr: kawaFactures, investorId: independentIds[1], amount: 25_000_000, status: 'NEGOTIATING',
    rounds: roundsAwaitingPme(mulberry32(42), 9), createdAt: daysAgo(4),
  });
  await prisma.fundingRequest.update({ where: { id: kawaFactures.id }, data: { amountRaised: 80_000_000 } });
  await notify(kawaFactures.ownerId, "Nouvelle proposition d'investissement", `Un investisseur propose 25 000 000 F CFA à 9% sur "${kawaFactures.title}".`, daysAgo(4));

  const korhogoPret = byTitle("Extension unité d'égrenage de coton");
  specialHandled.add(korhogoPret.id);
  await createInvestment({
    fr: korhogoPret, investorId: testInstitutionOwnerId, amount: 200_000_000, status: 'NEGOTIATING',
    rounds: roundsAwaitingInvestor(mulberry32(43), 10.8), createdAt: daysAgo(15),
  });
  await notify(testInstitutionOwnerId, 'Réponse de la PME reçue', `Korhogo Coton SA a contre-proposé sur votre engagement de 200 000 000 F CFA.`, daysAgo(13));

  const freshniFactures = byTitle('Factures grande distribution');
  specialHandled.add(freshniFactures.id);
  const freshniRounds = roundsAccepted(mulberry32(44), 7.8);
  await createInvestment({
    fr: freshniFactures, investorId: testInvestorId, amount: 45_000_000, status: 'COMMITTED',
    lockedReturn: freshniRounds.lockedReturn, rounds: freshniRounds.rounds, createdAt: daysAgo(18),
  });
  await prisma.fundingRequest.update({ where: { id: freshniFactures.id }, data: { amountRaised: 45_000_000 } });

  const transCargoFleet = byTitle('Renouvellement flotte poids lourds');
  specialHandled.add(transCargoFleet.id);
  const tcRounds = roundsAccepted(mulberry32(45), 10);
  const tcInvestment = await createInvestment({
    fr: transCargoFleet, investorId: testInvestorId, amount: transCargoFleet.amountRequested,
    status: 'COMMITTED', lockedReturn: tcRounds.lockedReturn, rounds: tcRounds.rounds, createdAt: daysAgo(148),
  });
  await prisma.fundingRequest.update({ where: { id: transCargoFleet.id }, data: { amountRaised: transCargoFleet.amountRequested, status: 'FUNDED' } });
  await settleInvestment(transCargoFleet, tcInvestment, daysAgo(140), false);

  // -- règle générique pour toutes les autres demandes publiées / financées / clôturées --
  let cancelledInvestmentCreated = false;
  for (let idx = 0; idx < fundingCtx.length; idx++) {
    const fr = fundingCtx[idx];
    if (specialHandled.has(fr.id)) continue;
    const rng = mulberry32(7000 + idx);

    if (fr.status === 'PUBLISHED') {
      const r = rng();
      if (r < 0.15) continue; // fraîchement publiée, aucune offre encore

      if (r < 0.45) {
        const amount = Math.round(fr.amountRequested * range(rng, 0.05, 0.25));
        const investorId = pickInvestorPool(rng, amount, institutionIds, independentIds);
        const awaitingPme = rng() < 0.5;
        await createInvestment({
          fr, investorId, amount, status: 'NEGOTIATING', createdAt: daysAgo(rangeInt(rng, 1, 10)),
          rounds: awaitingPme ? roundsAwaitingPme(rng, fr.expectedReturn) : roundsAwaitingInvestor(rng, fr.expectedReturn),
        });
      } else {
        const ratio = range(rng, 0.2, 0.55);
        const amount = Math.round(fr.amountRequested * ratio);
        const investorId = pickInvestorPool(rng, amount, institutionIds, independentIds);
        const rounds = roundsAccepted(rng, fr.expectedReturn);
        await createInvestment({
          fr, investorId, amount, status: 'COMMITTED', lockedReturn: rounds.lockedReturn, rounds: rounds.rounds,
          createdAt: daysAgo(rangeInt(rng, 2, 15)),
        });
        await prisma.fundingRequest.update({ where: { id: fr.id }, data: { amountRaised: amount } });

        if (r >= 0.75) {
          const amount2 = Math.round(fr.amountRequested * range(rng, 0.05, 0.2));
          const investorId2 = pickInvestorPool(rng, amount2, institutionIds, independentIds);
          await createInvestment({
            fr, investorId: investorId2, amount: amount2, status: 'NEGOTIATING',
            rounds: roundsAwaitingPme(rng, fr.expectedReturn), createdAt: daysAgo(rangeInt(rng, 1, 5)),
          });
        }
      }
      continue;
    }

    if (fr.status === 'FUNDED' || fr.status === 'CLOSED') {
      const createdDaysAgo = Math.round((now.getTime() - fr.createdAt.getTime()) / 86_400_000);
      const twoTickets = fr.amountRequested >= 200_000_000 && rng() < 0.5;
      const settledDaysAgo = fr.status === 'CLOSED'
        ? Math.max(createdDaysAgo - 5, fr.durationMonths * 30 + 20)
        : rangeInt(rng, 10, Math.max(createdDaysAgo - 2, 12));

      if (twoTickets) {
        const share = range(rng, 0.4, 0.6);
        const amount1 = Math.round(fr.amountRequested * share);
        const amount2 = fr.amountRequested - amount1;
        for (const amount of [amount1, amount2]) {
          const investorId = pickInvestorPool(rng, amount, institutionIds, independentIds);
          const rounds = roundsAccepted(rng, fr.expectedReturn);
          const inv = await createInvestment({
            fr, investorId, amount, status: 'COMMITTED', lockedReturn: rounds.lockedReturn, rounds: rounds.rounds,
            createdAt: daysAgo(settledDaysAgo + rangeInt(rng, 3, 8)),
          });
          await settleInvestment(fr, inv, daysAgo(settledDaysAgo), fr.status === 'CLOSED');
        }
      } else {
        const investorId = pickInvestorPool(rng, fr.amountRequested, institutionIds, independentIds);
        const rounds = roundsAccepted(rng, fr.expectedReturn);
        const inv = await createInvestment({
          fr, investorId, amount: fr.amountRequested, status: 'COMMITTED', lockedReturn: rounds.lockedReturn,
          rounds: rounds.rounds, createdAt: daysAgo(settledDaysAgo + rangeInt(rng, 3, 8)),
        });
        await settleInvestment(fr, inv, daysAgo(settledDaysAgo), fr.status === 'CLOSED');
      }
      await prisma.fundingRequest.update({ where: { id: fr.id }, data: { amountRaised: fr.amountRequested } });
      continue;
    }

    if (fr.status === 'CANCELLED' && (!cancelledInvestmentCreated || rng() < 0.4)) {
      const amount = Math.round(fr.amountRequested * range(rng, 0.1, 0.3));
      const investorId = pickInvestorPool(rng, amount, institutionIds, independentIds);
      await createInvestment({ fr, investorId, amount, status: 'CANCELLED', createdAt: daysAgo(rangeInt(rng, 20, 60)) });
      cancelledInvestmentCreated = true;
    }
  }

  // -- couverture des états INTERESTED / REJECTED (non atteignables via l'API actuelle,
  // mais légitimes au niveau du schéma — utiles pour les tests admin) — sur des demandes
  // qui n'ont pas déjà reçu un scénario dédié, pour ne pas surcharger les mêmes deals --
  const openDeals = fundingCtx.filter((f) => f.status === 'PUBLISHED' && !specialHandled.has(f.id));
  if (openDeals.length >= 2) {
    await createInvestment({ fr: openDeals[0], investorId: independentIds[2], amount: Math.round(openDeals[0].amountRequested * 0.1), status: 'INTERESTED', createdAt: daysAgo(2) });
    await createInvestment({ fr: openDeals[1], investorId: independentIds[3], amount: Math.round(openDeals[1].amountRequested * 0.15), status: 'REJECTED', createdAt: daysAgo(6) });
  }

  return { institutionIds, independentIds };
}

// ── Documents KYC ────────────────────────────────────────────────────────────────

function currentYear(): number { return now.getFullYear(); }
function kycRequirements() {
  const y = currentYear();
  return [
    { key: 'RCCM', label: 'RCCM', documentType: 'ORGANIZATION_LEGAL' },
    { key: `BILAN_${y - 2}`, label: `Bilan ${y - 2}`, documentType: 'FINANCIAL_STATEMENT' },
    { key: `BILAN_${y - 1}`, label: `Bilan ${y - 1}`, documentType: 'FINANCIAL_STATEMENT' },
    { key: 'CNI_DIRIGEANT', label: 'Carte CNI Dirigeant', documentType: 'KYC_ID' },
    { key: `ATTESTATION_FISCALE_${y}`, label: `Attestation fiscale ${y}`, documentType: 'FINANCIAL_STATEMENT' },
    { key: 'PLAN_TRESORERIE', label: 'Plan de trésorerie', documentType: 'FINANCIAL_STATEMENT' },
  ];
}

async function ensureDocuments() {
  const reqs = kycRequirements();
  let i = 0;
  for (const spec of ORGANIZATIONS) {
    const ctx = orgCtx[spec.registrationNumber];
    const rng = mulberry32(11_000 + i++);
    const keepRatio = spec.verificationStatus === 'VERIFIED' ? 1 : spec.verificationStatus === 'PENDING' ? 0.55 : 0.25;

    for (const req of reqs) {
      if (rng() > keepRatio) continue;
      const status = spec.verificationStatus === 'REJECTED' && rng() < 0.5
        ? 'REJECTED'
        : rng() < 0.85 ? 'APPROVED' : 'PENDING_REVIEW';
      await prisma.document.create({
        data: {
          type: req.documentType as any, storageKey: storageKey(req.documentType, { organizationId: ctx.organizationId }),
          fileName: `${req.key.toLowerCase()}.pdf`, mimeType: 'application/pdf', sizeBytes: rangeInt(rng, 60_000, 1_200_000),
          status: status as any, kycRequirementKey: req.key, uploadedById: ctx.ownerId, organizationId: ctx.organizationId,
          createdAt: daysAgo(rangeInt(rng, 30, 500)),
        },
      });
    }
  }

  for (const fr of fundingCtx) {
    if (fr.status === 'DRAFT') continue;
    const rng = mulberry32(12_000 + i++);
    await prisma.document.create({
      data: {
        type: 'FUNDING_REQUEST_ATTACHMENT', storageKey: storageKey('FUNDING_REQUEST_ATTACHMENT', { fundingRequestId: fr.id }),
        fileName: `dossier-${fr.id.slice(0, 8)}.pdf`, mimeType: 'application/pdf', sizeBytes: rangeInt(rng, 100_000, 2_000_000),
        status: fr.status === 'REJECTED' ? 'PENDING_REVIEW' : 'APPROVED', uploadedById: fr.ownerId,
        fundingRequestId: fr.id, createdAt: fr.createdAt,
      },
    });
  }
}

// ── Watchlist ────────────────────────────────────────────────────────────────────

async function ensureWatchlist(investorIds: string[]) {
  const published = fundingCtx.filter((f) => f.status === 'PUBLISHED' || f.status === 'FUNDED');
  if (published.length === 0) return;
  for (let i = 0; i < investorIds.length; i++) {
    const rng = mulberry32(13_000 + i);
    const count = rangeInt(rng, 1, 4);
    const picks = new Set<number>();
    for (let c = 0; c < count; c++) picks.add(Math.floor(rng() * published.length));
    for (const p of picks) {
      const fr = published[p];
      try {
        await prisma.watchlist.create({ data: { investorId: investorIds[i], fundingRequestId: fr.id, createdAt: daysAgo(rangeInt(rng, 1, 30)) } });
      } catch {
        // doublon (contrainte unique investorId+fundingRequestId) — ignoré
      }
    }
  }
}

// ── Disputes ─────────────────────────────────────────────────────────────────────

const DISPUTE_TEMPLATES: { category: string; title: string; description: string; status: string; resolutionNote?: string }[] = [
  { category: 'PAYMENT_ISSUE', title: 'Retard sur échéance mensuelle', description: "L'échéance du mois dernier n'a pas été réglée à la date prévue.", status: 'RESOLVED', resolutionNote: 'Paiement reçu avec 5 jours de retard, régularisé.' },
  { category: 'DOCUMENT_DISPUTE', title: 'Document illisible transmis', description: 'Le bilan transmis est une copie de mauvaise qualité, chiffres illisibles.', status: 'RESOLVED', resolutionNote: 'Nouveau document transmis et validé.' },
  { category: 'COMMUNICATION_ISSUE', title: 'Absence de réponse depuis 2 semaines', description: "Aucune réponse de la PME suite à la demande de compléments d'information.", status: 'IN_REVIEW' },
  { category: 'FRAUD_SUSPICION', title: 'Incohérence entre factures et RCCM', description: 'Le nom du débiteur ne correspond à aucun client déclaré dans le profil.', status: 'IN_REVIEW' },
  { category: 'PAYMENT_ISSUE', title: 'Montant réglé inférieur au montant dû', description: "L'investisseur signale un virement partiel de l'échéance.", status: 'OPEN' },
  { category: 'OTHER', title: 'Demande de report d\'échéance', description: 'La PME sollicite un report exceptionnel de 30 jours suite à un incident logistique.', status: 'OPEN' },
  { category: 'DOCUMENT_DISPUTE', title: 'Preuve de règlement manquante', description: "Le document de preuve de règlement n'a jamais été téléversé.", status: 'CLOSED', resolutionNote: 'Preuve finalement récupérée directement auprès de la banque.' },
  { category: 'COMMUNICATION_ISSUE', title: "Coordonnées de contact obsolètes", description: "Le numéro de téléphone du dirigeant n'est plus attribué.", status: 'CLOSED', resolutionNote: 'Coordonnées mises à jour par la PME.' },
];

async function ensureDisputes(adminId: string) {
  const candidates = fundingCtx.filter((f) => f.status === 'FUNDED' || f.status === 'CLOSED' || f.status === 'PUBLISHED');

  // Investisseur réel de la demande (s'il y en a un) — indispensable pour qu'un litige
  // "PAYMENT_ISSUE" soit ouvert par quelqu'un qui a effectivement un engagement en cours.
  const investments = await prisma.investment.findMany({
    where: { fundingRequestId: { in: candidates.map((f) => f.id) }, status: { in: ['NEGOTIATING', 'COMMITTED', 'SETTLED_OFF_PLATFORM'] } },
  });
  const investorByFr = new Map<string, string>();
  for (const inv of investments) if (!investorByFr.has(inv.fundingRequestId)) investorByFr.set(inv.fundingRequestId, inv.investorId);
  const withInvestor = candidates.filter((f) => investorByFr.has(f.id));
  const fallbackPool = candidates.length > 0 ? candidates : fundingCtx;

  for (let i = 0; i < DISPUTE_TEMPLATES.length; i++) {
    const tpl = DISPUTE_TEMPLATES[i];
    const pool = tpl.category === 'PAYMENT_ISSUE' && withInvestor.length > 0 ? withInvestor : fallbackPool;
    const fr = pool[i % pool.length];
    const rng = mulberry32(14_000 + i);
    const createdAt = daysAgo(rangeInt(rng, 5, 90));
    const investorId = investorByFr.get(fr.id);

    // Toujours le vrai propriétaire de la PME concernée (ou l'investisseur réellement
    // engagé) — jamais un tiers d'une autre organisation.
    const openedById = tpl.category === 'FRAUD_SUSPICION'
      ? adminId
      : tpl.category === 'PAYMENT_ISSUE' && investorId
        ? investorId
        : fr.ownerId;

    const resolvedAt = tpl.resolutionNote ? daysAgo(rangeInt(rng, 1, 4)) : null;

    const dispute = await prisma.dispute.create({
      data: {
        organizationId: fr.organizationId, fundingRequestId: fr.id, openedById, category: tpl.category as any,
        status: tpl.status as any, title: tpl.title, description: tpl.description,
        resolutionNote: tpl.resolutionNote, resolvedAt,
        createdAt,
      },
    });

    // Le message de résolution est daté à la même période que `resolvedAt` — sinon un
    // fil de discussion vieux de plusieurs semaines annoncerait une résolution "récente".
    const messages = [
      { authorId: openedById, content: tpl.description, createdAt },
      { authorId: adminId, content: 'Merci pour le signalement, nous regardons le dossier.', createdAt: new Date(createdAt.getTime() + 2 * 3600 * 1000) },
    ];
    if (tpl.resolutionNote && resolvedAt) messages.push({ authorId: adminId, content: tpl.resolutionNote, createdAt: resolvedAt });

    for (const m of messages) {
      await prisma.disputeMessage.create({ data: { disputeId: dispute.id, authorId: m.authorId, content: m.content, createdAt: m.createdAt } });
    }
  }
}

// ── Alertes AML ──────────────────────────────────────────────────────────────────

async function ensureAmlAlerts() {
  const existing = await prisma.amlAlert.count();
  if (existing > 0) return;

  const orgById = new Map(ORGANIZATIONS.map((o) => [orgCtx[o.registrationNumber]?.organizationId, o.legalName]));
  const institutionNames = INSTITUTIONS.map((i) => i.name);
  const alertTypes = ['TRANSACTION_INHABITUELLE', 'PEP_DETECTE', 'BENEFICIAIRE_NON_IDENTIFIE'] as const;

  // Organisations où chaque institution a une exposition réelle (un de ses membres a
  // investi sur une demande de cette PME) — une alerte AML doit prioritairement porter
  // sur un client que l'institution connaît déjà, pas une PME tirée au hasard.
  const exposureByInstitution = new Map<string, string[]>();
  for (const name of institutionNames) {
    const memberIds = new Set(institutionCtx[name].memberIds);
    const invs = await prisma.investment.findMany({
      where: { investorId: { in: [...memberIds] } },
      include: { fundingRequest: { select: { organizationId: true } } },
    });
    exposureByInstitution.set(name, [...new Set(invs.map((i) => i.fundingRequest.organizationId))]);
  }

  let n = 0;
  for (const name of institutionNames) {
    const inst = institutionCtx[name];
    const exposure = exposureByInstitution.get(name) ?? [];
    const alertCount = name === 'Banque Atlantique CI' ? 4 : rangeInt(mulberry32(15_000 + n), 2, 4);
    for (let k = 0; k < alertCount; k++) {
      const rng = mulberry32(15_000 + n++);
      const isNewClient = exposure.length === 0 || rng() < 0.3;
      const organizationId = isNewClient ? null : pick(rng, exposure);
      const statusRoll = rng();
      const status = statusRoll < 0.45 ? 'EN_ANALYSE' : statusRoll < 0.7 ? 'BLOQUE' : 'RESOLU';
      const detectedAt = daysAgo(rangeInt(rng, 2, 60));
      await prisma.amlAlert.create({
        data: {
          institutionId: inst.id, organizationId,
          clientLabel: organizationId ? (orgById.get(organizationId) ?? 'Client') : 'Nouveau client',
          alertType: pick(rng, alertTypes), amount: rng() < 0.8 ? Math.round(range(rng, 5_000_000, 60_000_000)) : null,
          status: status as any, detectedAt, resolvedAt: status === 'RESOLU' ? daysAgo(rangeInt(rng, 0, 5)) : null,
          createdAt: detectedAt,
        },
      });
    }
  }
}

// ── Programme principal ──────────────────────────────────────────────────────────

async function main() {
  console.log('Seed complet — démarrage…');

  const admin = await ensureUser({ email: 'admin@lefinancier.ci', firstName: 'Admin', lastName: 'LeFinancier', role: 'ADMIN', passwordHash: ADMIN_PASSWORD_HASH, kycStatus: 'VERIFIED' });
  await ensureUser({ email: 'direction@lefinancier.ci', firstName: 'Fatou', lastName: 'Diabaté', role: 'SUPER_ADMIN', passwordHash: DEMO_PASSWORD_HASH, kycStatus: 'VERIFIED' });
  await ensureUser({ email: 'conformite@lefinancier.ci', firstName: 'Bertin', lastName: "N'Guessan", role: 'ADMIN', passwordHash: DEMO_PASSWORD_HASH, kycStatus: 'VERIFIED' });

  const testPme = await ensureUser({ email: 'test@lefinancier.ci', firstName: 'Test', lastName: 'PME', role: 'PME_OWNER', passwordHash: TEST_ACCOUNT_PASSWORD_HASH, kycStatus: 'VERIFIED' });
  const testInvestor = await ensureUser({ email: 'investisseur@lefinancier.ci', firstName: 'Test', lastName: 'Investisseur', role: 'INVESTOR', passwordHash: TEST_ACCOUNT_PASSWORD_HASH, kycStatus: 'VERIFIED' });

  console.log('Institutions & équipes…');
  await ensureInstitutions();

  console.log('Organisations (30) & profils de crédit…');
  await ensureOrganizations(testPme.id, admin.id);

  console.log('Demandes de financement (38), scoring inputs & rapports…');
  await ensureFundingRequestsAndScoring(admin.id);

  console.log('Investissements, négociations, échéanciers & commissions…');
  const { independentIds } = await createInvestmentsAndRepayments(testInvestor.id, institutionCtx['Banque Atlantique CI'].ownerId);

  console.log('Documents (KYC + pièces jointes + preuves de règlement)…');
  await ensureDocuments();

  console.log('Watchlist…');
  await ensureWatchlist([...Object.values(institutionCtx).map((i) => i.ownerId), ...independentIds]);

  console.log('Disputes & messages…');
  await ensureDisputes(admin.id);

  console.log('Alertes AML…');
  await ensureAmlAlerts();

  console.log('Notifications complémentaires…');
  for (const fr of fundingCtx) {
    if (fr.status === 'FUNDED') {
      const daysSinceCreation = Math.round((now.getTime() - fr.createdAt.getTime()) / 86_400_000);
      const fundedAt = daysAgo(Math.max(Math.round(daysSinceCreation / 3), 1));
      await notify(fr.ownerId, 'Demande entièrement financée', `"${fr.title}" a atteint 100% de son objectif.`, fundedAt);
    }
  }
  await notify(testPme.id, 'Bienvenue sur LeFinancier', 'Complétez votre profil de crédit pour accélérer le traitement de vos demandes.', daysAgo(25), true);
  await notify(testInvestor.id, 'Bienvenue sur LeFinancier', 'Explorez les opportunités publiées et suivez vos engagements depuis votre tableau de bord.', daysAgo(20), true);

  const orgStats = { total: ORGANIZATIONS.length, funding: fundingCtx.length };
  console.log(`Seed complet terminé : ${orgStats.total} organisations, ${orgStats.funding} demandes de financement.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
