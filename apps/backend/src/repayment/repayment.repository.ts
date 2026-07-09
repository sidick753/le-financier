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
          // Prélevée immédiatement sur les fonds réglés, pas de flux de collecte séparé.
          status: 'COLLECTED',
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

  async confirmPayment(scheduleId: string, userId: string, proofDocumentId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const schedule = await tx.repaymentSchedule.findUnique({
        where: { id: scheduleId },
      });

      if (!schedule) throw new Error('Échéance introuvable.');
      if (schedule.status === 'PAID') throw new Error('Cette échéance est déjà payée.');

      const payment = await tx.repaymentPayment.create({
        data: {
          repaymentScheduleId: scheduleId,
          amountPaid: schedule.amountDue,
          paidAt: new Date(),
          confirmedById: userId,
          proofDocumentId,
        },
      });

      await tx.repaymentSchedule.update({
        where: { id: scheduleId },
        data: { status: 'PAID' },
      });

      const interestAmount = Number(schedule.interestAmount);
      if (interestAmount > 0) {
        const interestCommission = interestAmount * INTEREST_FEE_RATE;
        await tx.commission.create({
          data: {
            type: 'INTEREST_FEE',
            fundingRequestId: schedule.fundingRequestId,
            repaymentPaymentId: payment.id,
            baseAmount: interestAmount,
            rate: INTEREST_FEE_RATE,
            commissionAmount: interestCommission,
            // Prélevée immédiatement sur l'échéance confirmée, pas de flux de collecte séparé.
            status: 'COLLECTED',
          },
        });
      }

      return payment;
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
