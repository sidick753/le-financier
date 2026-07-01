import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@le-financier/database';
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
            status: 'PENDING',
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
}
