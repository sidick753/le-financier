import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@le-financier/database';
import { generateSchedule } from './repayment-schedule.generator';
import { IRepaymentRepository } from './interfaces/repayment-repository.interface';

const FUNDING_FEE_RATE = 0.02;
const INTEREST_FEE_RATE = 0.03;

@Injectable()
export class RepaymentRepository implements IRepaymentRepository {
  private prisma = new PrismaClient();

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

      const fundingCommission = params.amountCommitted * FUNDING_FEE_RATE;
      await tx.commission.create({
        data: {
          type: 'FUNDING_FEE',
          fundingRequestId: params.fundingRequestId,
          baseAmount: params.amountCommitted,
          rate: FUNDING_FEE_RATE,
          commissionAmount: fundingCommission,
          // Due, mais collectée seulement au décaissement (FundingRepository.disburse) —
          // c'est là que la plateforme prélève effectivement sa part sur le virement sortant.
          status: 'PENDING',
        },
      });
    });
  }

  async findScheduleByInvestmentId(investmentId: string) {
    return this.prisma.repaymentSchedule.findMany({
      where: { investmentId },
      include: { payments: true },
      orderBy: { dueDate: 'asc' },
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

  async findUpcomingByInvestorId(investorId: string, limit = 5) {
    return this.prisma.repaymentSchedule.findMany({
      where: {
        investment: { investorId },
        status: 'PENDING',
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
  async confirmPayment(scheduleId: string, userId: string, proofDocumentId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const schedule = await tx.repaymentSchedule.findUnique({
        where: { id: scheduleId },
      });

      if (!schedule) throw new Error('Échéance introuvable.');
      if (schedule.status === 'PAID') throw new Error('Cette échéance est déjà payée.');

      return tx.repaymentPayment.create({
        data: {
          repaymentScheduleId: scheduleId,
          amountPaid: schedule.amountDue,
          paidAt: new Date(),
          status: 'PENDING_VALIDATION',
          confirmedById: userId,
          proofDocumentId,
        },
      });
    });
  }

  // [ADMIN] Valide la preuve : paiement confirmé, échéance soldée, commission d'intérêt
  // collectée et reversement net à l'investisseur considéré effectué dans le même geste
  // (pas de bundle multi-investisseurs à ce niveau, contrairement au décaissement du financement).
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
          disbursedAt: now,
        },
      });

      await tx.repaymentSchedule.update({
        where: { id: payment.repaymentScheduleId },
        data: { status: 'PAID' },
      });

      if (payment.proofDocumentId) {
        await tx.document.update({
          where: { id: payment.proofDocumentId },
          data: { status: 'APPROVED' },
        });
      }

      const interestAmount = Number(payment.repaymentSchedule.interestAmount);
      if (interestAmount > 0) {
        const interestCommission = interestAmount * INTEREST_FEE_RATE;
        await tx.commission.create({
          data: {
            type: 'INTEREST_FEE',
            fundingRequestId: payment.repaymentSchedule.fundingRequestId,
            repaymentPaymentId: payment.id,
            baseAmount: interestAmount,
            rate: INTEREST_FEE_RATE,
            commissionAmount: interestCommission,
            // Collectée immédiatement : le reversement net à l'investisseur se fait dans
            // le même geste que la validation, contrairement au décaissement du financement.
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

  async findPaymentsByInvestorId(investorId: string) {
    return this.prisma.repaymentPayment.findMany({
      where: { repaymentSchedule: { investment: { investorId } } },
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
