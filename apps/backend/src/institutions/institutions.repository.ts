import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@le-financier/database';

const ACTIVE_INVESTMENT_STATUSES = ['NEGOTIATING', 'COMMITTED', 'SETTLED_OFF_PLATFORM'] as const;

@Injectable()
export class InstitutionsRepository {
  private prisma = new PrismaClient();

  async findMembershipByUserId(userId: string) {
    return this.prisma.institutionMember.findUnique({ where: { userId } });
  }

  async provisionInstitution(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const name = user ? `${user.firstName} ${user.lastName}` : 'Mon institution';

    return this.prisma.$transaction(async (tx) => {
      const institution = await tx.institution.create({ data: { name } });
      return tx.institutionMember.create({
        data: { userId, institutionId: institution.id, role: 'OWNER' },
      });
    });
  }

  async findInstitutionById(id: string) {
    return this.prisma.institution.findUnique({ where: { id } });
  }

  async updateProfile(id: string, data: Prisma.InstitutionUpdateInput) {
    return this.prisma.institution.update({ where: { id }, data });
  }

  async updateLimits(id: string, data: Prisma.InstitutionUpdateInput) {
    return this.prisma.institution.update({ where: { id }, data });
  }

  async setApiKey(id: string, apiKeyHash: string, apiKeyLastFour: string) {
    return this.prisma.institution.update({
      where: { id },
      data: { apiKeyHash, apiKeyLastFour, apiKeyGeneratedAt: new Date() },
    });
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async createMember(
    institutionId: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      passwordHash: string;
      role: string;
      specialty?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'INSTITUTION',
          kycStatus: 'VERIFIED',
        },
      });
      return tx.institutionMember.create({
        data: {
          userId: user.id,
          institutionId,
          role: data.role as any,
          specialty: data.specialty,
        },
      });
    });
  }

  async findMemberById(id: string) {
    return this.prisma.institutionMember.findUnique({ where: { id } });
  }

  async updateMember(id: string, data: Prisma.InstitutionMemberUpdateInput) {
    return this.prisma.institutionMember.update({ where: { id }, data });
  }

  async removeMember(id: string) {
    return this.prisma.institutionMember.delete({ where: { id } });
  }

  async findMembersWithStats(institutionId: string) {
    const members = await this.prisma.institutionMember.findMany({
      where: { institutionId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const userIds = members.map((m) => m.userId);
    const investments = await this.prisma.investment.findMany({
      where: { investorId: { in: userIds }, status: { in: [...ACTIVE_INVESTMENT_STATUSES] } },
      select: { investorId: true, amountCommitted: true },
    });

    return members.map((member) => {
      const own = investments.filter((i) => i.investorId === member.userId);
      return {
        id: member.id,
        userId: member.userId,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        email: member.user.email,
        role: member.role,
        status: member.status,
        specialty: member.specialty,
        dossiersActifs: own.length,
        encoursGere: own.reduce((sum, i) => sum + Number(i.amountCommitted), 0),
      };
    });
  }

  async computeRiskIndicators(institutionId: string) {
    const memberUserIds = (
      await this.prisma.institutionMember.findMany({
        where: { institutionId },
        select: { userId: true },
      })
    ).map((m) => m.userId);

    const investments = await this.prisma.investment.findMany({
      where: { investorId: { in: memberUserIds }, status: { in: ['COMMITTED', 'SETTLED_OFF_PLATFORM'] } },
      select: {
        amountCommitted: true,
        fundingRequest: {
          select: { id: true, category: true, organization: { select: { sector: true } } },
        },
      },
    });

    const totalEncours = investments.reduce((sum, i) => sum + Number(i.amountCommitted), 0);

    const bySector: Record<string, number> = {};
    for (const inv of investments) {
      const sector = inv.fundingRequest.organization.sector;
      bySector[sector] = (bySector[sector] ?? 0) + Number(inv.amountCommitted);
    }
    const maxSectorAmount = Object.values(bySector).reduce((max, v) => Math.max(max, v), 0);

    const fundingRequestIds = [...new Set(investments.map((i) => i.fundingRequest.id))];
    const schedules = fundingRequestIds.length
      ? await this.prisma.repaymentSchedule.findMany({
          where: { fundingRequestId: { in: fundingRequestIds } },
          select: { status: true },
        })
      : [];

    const pretFundingRequestIds = investments
      .filter((i) => i.fundingRequest.category === 'PRET')
      .map((i) => i.fundingRequest.id);
    const scoringInputs = pretFundingRequestIds.length
      ? await this.prisma.scoringInput.findMany({
          where: { fundingRequestId: { in: pretFundingRequestIds }, garantieCouverture: { not: null } },
          select: { garantieCouverture: true },
        })
      : [];

    return {
      totalEncours,
      npl: schedules.length,
      nplOverdue: schedules.filter((s) => s.status === 'OVERDUE').length,
      concentrationSectorielle: totalEncours > 0 ? (maxSectorAmount / totalEncours) * 100 : null,
      couvertureGaranties:
        scoringInputs.length > 0
          ? (scoringInputs.reduce((sum, si) => sum + Number(si.garantieCouverture), 0) / scoringInputs.length) * 100
          : null,
    };
  }

  // ── Alertes AML / LAB-CFT ──────────────────────────────────────────────

  async findAmlAlerts(institutionId: string) {
    return this.prisma.amlAlert.findMany({
      where: { institutionId },
      orderBy: { detectedAt: 'desc' },
    });
  }

  async findAmlAlertById(id: string) {
    return this.prisma.amlAlert.findUnique({ where: { id } });
  }

  async resolveAmlAlert(id: string) {
    return this.prisma.amlAlert.update({
      where: { id },
      data: { status: 'RESOLU', resolvedAt: new Date() },
    });
  }
}
