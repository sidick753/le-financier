import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@le-financier/database';
import { generateSchedule } from './repayment-schedule.generator';
import { IRepaymentRepository } from './interfaces/repayment-repository.interface';
import { PayoutClaimsRepository } from '../payout-claims/payout-claims.repository';

const INTEREST_FEE_RATE = 0.03;

@Injectable()
export class RepaymentRepository implements IRepaymentRepository {
  private prisma = new PrismaClient();

  constructor(private payoutClaims: PayoutClaimsRepository) {}

  async generateScheduleForInvestment(params: {
    investmentId: string;
    fundingRequestId: string;
    amountCommitted: number;
    lockedReturn: number;
    durationMonths: number;
    category: string;
  }) {
    const entries = generateSchedule({ ...params, startDate: new Date() });

    await this.prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        await tx.repaymentSchedule.create({ data: entry });
      }
    });
    // La commission FUNDING_FEE n'est plus créée ici : elle est désormais calculée
    // et collectée au prorata de chaque réclamation PME (voir FundingRepository.approveClaim),
    // pour rester cohérente avec un décaissement qui peut désormais être partiel.
  }

  async findScheduleByInvestmentId(investmentId: string) {
    return this.prisma.repaymentSchedule.findMany({
      where: { investmentId },
      include: { payments: true },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findInvestmentOwner(investmentId: string) {
    return this.prisma.investment.findUnique({
      where: { id: investmentId },
      select: { investorId: true },
    });
  }

  async findScheduleByFundingRequestId(fundingRequestId: string) {
    return this.prisma.repaymentSchedule.findMany({
      where: { fundingRequestId },
      include: {
        investment: {
          include: { investor: { select: { firstName: true, lastName: true } } },
        },
        payments: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findUpcomingByInvestorIds(investorIds: string[], limit = 5) {
    return this.prisma.repaymentSchedule.findMany({
      where: {
        investment: { investorId: { in: investorIds } },
        status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        dueDate: { gte: new Date() },
      },
      include: {
        fundingRequest: {
          include: { organization: { select: { legalName: true } } },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: limit,
    });
  }

  async findScheduleById(scheduleId: string) {
    return this.prisma.repaymentSchedule.findUnique({ where: { id: scheduleId } });
  }

  async findPaymentById(paymentId: string) {
    return this.prisma.repaymentPayment.findUnique({
      where: { id: paymentId },
      include: { repaymentSchedule: { include: { investment: true } } },
    });
  }

  // Soumission par la PME : dépose une preuve de virement sur le compte plateforme,
  // en attente de validation admin. Ne touche pas l'échéance ni la commission.
  // Le montant peut être partiel (paiement en plusieurs tranches) — s'il est omis,
  // couvre tout le solde restant dû (comportement historique).
  async confirmPayment(scheduleId: string, userId: string, amount?: number, proofDocumentId?: string) {
    return this.prisma.$transaction(async (tx) => {
      // Verrou de ligne : empêche deux soumissions concurrentes de lire le même solde
      // restant avant que l'une des deux n'ait inséré sa tranche (voir aussi le calcul
      // de `remaining` ci-dessous, qui doit englober PENDING_VALIDATION pour la même raison).
      await tx.$queryRaw`SELECT id FROM repayment_schedules WHERE id = ${scheduleId} FOR UPDATE`;

      const schedule = await tx.repaymentSchedule.findUnique({
        where: { id: scheduleId },
      });

      if (!schedule) throw new Error('Échéance introuvable.');
      if (schedule.status === 'PAID') throw new Error('Cette échéance est déjà payée.');

      // Solde restant = montant dû - tranches déjà validées OU en attente de validation.
      // Une tranche PENDING_VALIDATION peut encore être confirmée par un admin : elle doit
      // donc déjà être décomptée, sans quoi deux soumissions successives peuvent ensemble
      // dépasser amountDue avant qu'un admin n'ait statué sur la première.
      const pendingSum = await tx.repaymentPayment.aggregate({
        where: { repaymentScheduleId: scheduleId, status: { in: ['CONFIRMED', 'PENDING_VALIDATION'] } },
        _sum: { amountPaid: true },
      });
      const remaining = Number(schedule.amountDue) - Number(pendingSum._sum.amountPaid ?? 0);
      const resolvedAmount = amount ?? remaining;

      if (resolvedAmount <= 0 || resolvedAmount > remaining) {
        throw new ConflictException(
          `Montant invalide. Il reste ${remaining} à régler sur cette échéance.`,
        );
      }

      return tx.repaymentPayment.create({
        data: {
          repaymentScheduleId: scheduleId,
          amountPaid: resolvedAmount,
          paidAt: new Date(),
          status: 'PENDING_VALIDATION',
          confirmedById: userId,
          proofDocumentId,
        },
      });
    });
  }

  // [ADMIN] Valide la preuve d'une tranche : la commission d'intérêt est prélevée au
  // prorata de cette tranche (même ratio intérêt/principal que l'échéance entière), et
  // l'échéance passe PARTIALLY_PAID tant que le cumul validé n'atteint pas amountDue,
  // puis PAID. Ne verse plus directement l'investisseur : celui-ci doit désormais
  // réclamer le montant validé (voir requestRepaymentClaim/approveRepaymentClaim),
  // ce qui permet une réclamation avant que l'échéance soit intégralement soldée.
  async approvePayment(paymentId: string, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.repaymentPayment.findUnique({
        where: { id: paymentId },
        include: { repaymentSchedule: true },
      });
      if (!payment) throw new Error('Paiement introuvable.');
      if (payment.status !== 'PENDING_VALIDATION') {
        throw new Error("Ce paiement n'est pas en attente de validation.");
      }

      const now = new Date();
      const updatedPayment = await tx.repaymentPayment.update({
        where: { id: paymentId },
        data: {
          status: 'CONFIRMED',
          validatedById: adminId,
          validatedAt: now,
        },
      });

      const schedule = payment.repaymentSchedule;
      const amountDue = Number(schedule.amountDue);
      const amountPaid = Number(payment.amountPaid);

      const confirmedSum = await tx.repaymentPayment.aggregate({
        where: { repaymentScheduleId: schedule.id, status: 'CONFIRMED' },
        _sum: { amountPaid: true },
      });
      const totalConfirmed = Number(confirmedSum._sum.amountPaid ?? 0);

      await tx.repaymentSchedule.update({
        where: { id: schedule.id },
        data: { status: totalConfirmed >= amountDue ? 'PAID' : 'PARTIALLY_PAID' },
      });

      if (payment.proofDocumentId) {
        await tx.document.update({
          where: { id: payment.proofDocumentId },
          data: { status: 'APPROVED' },
        });
      }

      // Portion d'intérêt de cette tranche précise, au même ratio que l'échéance entière
      // (interestAmount / amountDue) — évite de recompter l'intérêt plein à chaque tranche.
      const interestRatio = amountDue > 0 ? Number(schedule.interestAmount) / amountDue : 0;
      const trancheInterest = amountPaid * interestRatio;
      if (trancheInterest > 0) {
        const interestCommission = trancheInterest * INTEREST_FEE_RATE;
        await tx.commission.create({
          data: {
            type: 'INTEREST_FEE',
            fundingRequestId: schedule.fundingRequestId,
            repaymentPaymentId: payment.id,
            baseAmount: trancheInterest,
            rate: INTEREST_FEE_RATE,
            commissionAmount: interestCommission,
            // Collectée immédiatement sur la tranche validée, indépendamment du moment
            // où l'investisseur réclamera effectivement les fonds correspondants.
            status: 'COLLECTED',
          },
        });
      }

      return updatedPayment;
    });
  }

  // [ADMIN] Rejette la preuve : la PME doit resoumettre. L'échéance reste PENDING.
  async rejectPayment(paymentId: string, adminId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.repaymentPayment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new Error('Paiement introuvable.');
      if (payment.status !== 'PENDING_VALIDATION') {
        throw new Error("Ce paiement n'est pas en attente de validation.");
      }

      if (payment.proofDocumentId) {
        await tx.document.update({
          where: { id: payment.proofDocumentId },
          data: { status: 'REJECTED' },
        });
      }

      return tx.repaymentPayment.update({
        where: { id: paymentId },
        data: {
          status: 'REJECTED',
          validatedById: adminId,
          validatedAt: new Date(),
          rejectionReason: reason,
        },
      });
    });
  }

  // Investisseur : montant validé (CONFIRMED) sur cette échéance mais pas encore
  // couvert par une réclamation en cours ou déjà payée — ce qui reste "à réclamer".
  async getClaimableAmountForSchedule(scheduleId: string) {
    const [confirmedSum, claimed] = await Promise.all([
      this.prisma.repaymentPayment.aggregate({
        where: { repaymentScheduleId: scheduleId, status: 'CONFIRMED' },
        _sum: { amountPaid: true },
      }),
      this.payoutClaims.sumClaimed(this.prisma as any, 'REPAYMENT_TO_INVESTOR', { repaymentScheduleId: scheduleId }),
    ]);
    return Number(confirmedSum._sum.amountPaid ?? 0) - claimed;
  }

  async findScheduleInvestor(scheduleId: string) {
    const schedule = await this.prisma.repaymentSchedule.findUnique({
      where: { id: scheduleId },
      include: { investment: { select: { investorId: true } } },
    });
    return schedule ? { investorId: schedule.investment.investorId } : null;
  }

  // Investisseur : réclame tout ou partie du montant déjà validé par un admin sur cette
  // échéance, avant même qu'elle soit intégralement soldée (PARTIALLY_PAID accepté).
  // requestedById = la personne qui clique (traçabilité) ; authorizedInvestorIds = tous
  // les membres de son institution (voir InstitutionsService.getFellowMemberUserIds) —
  // l'échéance appartient à l'institution, pas à la personne qui a créé l'investissement.
  async requestRepaymentClaim(
    scheduleId: string,
    requestedById: string,
    authorizedInvestorIds: string[],
    amount?: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Verrou de ligne : empêche deux réclamations concurrentes de lire le même
      // disponible avant que l'une des deux n'ait inséré la sienne.
      await tx.$queryRaw`SELECT id FROM repayment_schedules WHERE id = ${scheduleId} FOR UPDATE`;

      const schedule = await tx.repaymentSchedule.findUnique({
        where: { id: scheduleId },
        include: { investment: { select: { investorId: true } } },
      });
      if (!schedule) throw new ConflictException('Échéance introuvable.');
      if (!authorizedInvestorIds.includes(schedule.investment.investorId)) {
        throw new ConflictException("Cette échéance n'appartient pas à cet investisseur.");
      }

      const confirmedSum = await tx.repaymentPayment.aggregate({
        where: { repaymentScheduleId: scheduleId, status: 'CONFIRMED' },
        _sum: { amountPaid: true },
      });
      const claimed = await this.payoutClaims.sumClaimed(tx, 'REPAYMENT_TO_INVESTOR', { repaymentScheduleId: scheduleId });
      const available = Number(confirmedSum._sum.amountPaid ?? 0) - claimed;

      return this.payoutClaims.validateAndCreate(
        tx,
        'REPAYMENT_TO_INVESTOR',
        { repaymentScheduleId: scheduleId },
        available,
        amount,
        requestedById,
      );
    });
  }

  // [ADMIN] Valide la réclamation et verse le net — la commission d'intérêt a déjà été
  // collectée au prorata à la validation des tranches (voir approvePayment), donc le net
  // ici applique simplement le même ratio au montant réclamé.
  async approveRepaymentClaim(claimId: string, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.payoutClaim.findUnique({
        where: { id: claimId },
        include: { repaymentSchedule: true },
      });
      if (!claim || claim.direction !== 'REPAYMENT_TO_INVESTOR' || !claim.repaymentSchedule) {
        throw new ConflictException('Réclamation introuvable.');
      }
      if (claim.status !== 'REQUESTED') {
        throw new ConflictException("Cette réclamation n'est pas en attente de décision.");
      }

      // Verrou de ligne : empêche une approbation concurrente (ou une nouvelle demande)
      // de recalculer le disponible sur un état déjà obsolète.
      await tx.$queryRaw`SELECT id FROM repayment_schedules WHERE id = ${claim.repaymentSchedule.id} FOR UPDATE`;

      const schedule = claim.repaymentSchedule;
      const confirmedSum = await tx.repaymentPayment.aggregate({
        where: { repaymentScheduleId: schedule.id, status: 'CONFIRMED' },
        _sum: { amountPaid: true },
      });
      const claimed = await this.payoutClaims.sumClaimed(
        tx,
        'REPAYMENT_TO_INVESTOR',
        { repaymentScheduleId: schedule.id },
        ['REQUESTED', 'PAID'],
        claimId,
      );
      const available = Number(confirmedSum._sum.amountPaid ?? 0) - claimed;
      if (Number(claim.amountRequested) > available) {
        throw new ConflictException('Le montant validé disponible a changé, réclamation à revoir.');
      }

      const amountDue = Number(schedule.amountDue);
      const interestRatio = amountDue > 0 ? Number(schedule.interestAmount) / amountDue : 0;
      const amountNet = Number(claim.amountRequested) * (1 - interestRatio * INTEREST_FEE_RATE);

      return this.payoutClaims.markPaid(tx, claimId, amountNet, adminId);
    });
  }

  async rejectRepaymentClaim(claimId: string, adminId: string, reason: string) {
    return this.payoutClaims.reject(claimId, 'REPAYMENT_TO_INVESTOR', adminId, reason);
  }

  async findClaimsForSchedule(scheduleId: string) {
    return this.payoutClaims.findMany('REPAYMENT_TO_INVESTOR', { repaymentScheduleId: scheduleId });
  }

  async findPendingRepaymentClaims() {
    return this.prisma.payoutClaim.findMany({
      where: { direction: 'REPAYMENT_TO_INVESTOR', status: 'REQUESTED' },
      include: {
        repaymentSchedule: {
          include: {
            fundingRequest: { select: { id: true, title: true } },
            investment: { include: { investor: { select: { firstName: true, lastName: true } } } },
          },
        },
        requestedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { requestedAt: 'asc' },
    });
  }

  async findPendingPayments() {
    return this.prisma.repaymentPayment.findMany({
      where: { status: 'PENDING_VALIDATION' },
      include: {
        repaymentSchedule: {
          include: {
            fundingRequest: { select: { id: true, title: true } },
            investment: {
              include: { investor: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findPaymentsByInvestorIds(investorIds: string[]) {
    return this.prisma.repaymentPayment.findMany({
      where: { repaymentSchedule: { investment: { investorId: { in: investorIds } } } },
      include: {
        repaymentSchedule: {
          include: {
            fundingRequest: {
              include: { organization: { select: { legalName: true } } },
            },
            investment: { select: { lockedReturn: true } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });
  }

  async findCommissionsByFundingRequestId(fundingRequestId: string) {
    return this.prisma.commission.findMany({
      where: { fundingRequestId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllCommissions(filters?: {
    type?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const where: Prisma.CommissionWhereInput = {
      ...(filters?.type ? { type: filters.type as any } : {}),
      ...(filters?.status ? { status: filters.status as any } : {}),
      ...(filters?.search
        ? {
            fundingRequest: {
              OR: [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { organization: { legalName: { contains: filters.search, mode: 'insensitive' } } },
              ],
            },
          }
        : {}),
    };
    const { page, limit } = filters ?? {};
    const hasPagination = page !== undefined && limit !== undefined;

    const [data, count] = await Promise.all([
      this.prisma.commission.findMany({
        where,
        include: {
          fundingRequest: {
            include: { organization: { select: { legalName: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: hasPagination ? (page - 1) * limit : undefined,
        take: hasPagination ? limit : undefined,
      }),
      hasPagination ? this.prisma.commission.count({ where }) : Promise.resolve(undefined),
    ]);

    return { data, total: count ?? data.length };
  }

  async getCommissionStats() {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalAgg, fundingAgg, interestAgg, thisMonthAgg, thisMonthVolumeAgg, recentCommissions] =
      await Promise.all([
        this.prisma.commission.aggregate({ _sum: { commissionAmount: true } }),
        this.prisma.commission.aggregate({
          _sum: { commissionAmount: true },
          where: { type: 'FUNDING_FEE' },
        }),
        this.prisma.commission.aggregate({
          _sum: { commissionAmount: true },
          where: { type: 'INTEREST_FEE' },
        }),
        this.prisma.commission.aggregate({
          _sum: { commissionAmount: true },
          where: { createdAt: { gte: startOfMonth } },
        }),
        this.prisma.commission.aggregate({
          _sum: { baseAmount: true },
          where: { createdAt: { gte: startOfMonth } },
        }),
        this.prisma.commission.findMany({
          where: { createdAt: { gte: sixMonthsAgo } },
          select: { commissionAmount: true, baseAmount: true, createdAt: true },
        }),
      ]);

    const monthly = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const inMonth = recentCommissions.filter(
        (c) => c.createdAt.getFullYear() === d.getFullYear() && c.createdAt.getMonth() === d.getMonth(),
      );
      return {
        label: d.toLocaleDateString('fr-FR', { month: 'short' }),
        commissions: inMonth.reduce((s, c) => s + Number(c.commissionAmount), 0),
        volume: inMonth.reduce((s, c) => s + Number(c.baseAmount), 0),
      };
    });

    return {
      total: Number(totalAgg._sum.commissionAmount ?? 0),
      fundingFees: Number(fundingAgg._sum.commissionAmount ?? 0),
      interestFees: Number(interestAgg._sum.commissionAmount ?? 0),
      thisMonth: Number(thisMonthAgg._sum.commissionAmount ?? 0),
      thisMonthVolume: Number(thisMonthVolumeAgg._sum.baseAmount ?? 0),
      monthly,
    };
  }

  async getTopOrganizations(take = 10) {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; legalName: string; volume: Prisma.Decimal; commissions: Prisma.Decimal; operations: number }>
    >(Prisma.sql`
      SELECT o.id, o."legalName",
        SUM(c."baseAmount") AS volume,
        SUM(c."commissionAmount") AS commissions,
        COUNT(*)::int AS operations
      FROM commissions c
      JOIN funding_requests fr ON fr.id = c."fundingRequestId"
      JOIN organizations o ON o.id = fr."organizationId"
      GROUP BY o.id, o."legalName"
      ORDER BY SUM(c."commissionAmount") DESC
      LIMIT ${take}
    `);

    return rows.map((r) => ({
      id: r.id,
      legalName: r.legalName,
      volume: Number(r.volume),
      commissions: Number(r.commissions),
      operations: r.operations,
    }));
  }
}
