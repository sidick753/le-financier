import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma, AmlAlertType } from '@le-financier/database';
import { CreateUserData } from '../users/interfaces/users-repository.interface';

const ACTIVE_INVESTMENT_STATUSES = ['NEGOTIATING', 'COMMITTED', 'SETTLED_OFF_PLATFORM'] as const;
// "Volume engagé" affiché aux admins ne compte que le capital réellement engagé,
// pas les négociations en cours — cohérent avec les pages Investisseurs/PME/Dashboard.
const ENGAGED_INVESTMENT_STATUSES = ['COMMITTED', 'SETTLED_OFF_PLATFORM'] as const;

@Injectable()
export class InstitutionsRepository {
  private prisma = new PrismaClient();

  async findMembershipByUserId(userId: string) {
    return this.prisma.institutionMember.findUnique({ where: { userId } });
  }

  async findMemberUserIds(institutionId: string) {
    const members = await this.prisma.institutionMember.findMany({
      where: { institutionId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
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

  async registerOwner(
    userData: Omit<CreateUserData, 'role'>,
    instData: { name: string; bceaoApprovalNumber?: string; country?: string },
  ) {
    // Inscription INSTITUTION : User + Institution + InstitutionMember(OWNER) créés
    // atomiquement, avec le nom saisi à l'inscription (plutôt que le nom générique
    // utilisé par l'auto-provisionnement paresseux de provisionInstitution()).
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { ...userData, role: 'INSTITUTION' } });
      const institution = await tx.institution.create({ data: instData });

      await tx.institutionMember.create({
        data: { userId: user.id, institutionId: institution.id, role: 'OWNER' },
      });

      return { user, institution };
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
      include: { user: { select: { firstName: true, lastName: true, email: true, kycStatus: true, kycRejectionReason: true } } },
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
        kycStatus: member.user.kycStatus,
        kycRejectionReason: member.user.kycRejectionReason,
        role: member.role,
        status: member.status,
        specialty: member.specialty,
        dossiersActifs: own.length,
        encoursGere: own.reduce((sum, i) => sum + Number(i.amountCommitted), 0),
      };
    });
  }

  // ── Admin (partenaires) ────────────────────────────────────────────────

  async findAllAdmin(filters?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const where: Prisma.InstitutionWhereInput = {
      ...(filters?.search
        ? { name: { contains: filters.search, mode: 'insensitive' as const } }
        : {}),
      ...(filters?.status
        ? { members: { some: { role: 'OWNER', user: { kycStatus: filters.status as any } } } }
        : {}),
    };
    const { page, limit } = filters ?? {};
    const hasPagination = page !== undefined && limit !== undefined;

    const [institutions, total] = await Promise.all([
      this.prisma.institution.findMany({
        where,
        include: {
          members: {
            where: { role: 'OWNER' },
            take: 1,
            include: { user: { select: { firstName: true, lastName: true, email: true, kycStatus: true } } },
          },
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: hasPagination ? (page - 1) * limit : undefined,
        take: hasPagination ? limit : undefined,
      }),
      this.prisma.institution.count({ where }),
    ]);

    const memberships = await this.prisma.institutionMember.findMany({
      where: { institutionId: { in: institutions.map((i) => i.id) } },
      select: { institutionId: true, userId: true },
    });
    const engagedByUser = await this.aggregateEngagedByUser(memberships.map((m) => m.userId));

    const data = institutions.map((inst) => {
      const memberUserIds = memberships
        .filter((m) => m.institutionId === inst.id)
        .map((m) => m.userId);
      return {
        id: inst.id,
        name: inst.name,
        type: inst.type,
        bceaoApprovalNumber: inst.bceaoApprovalNumber,
        envelopeMax: inst.envelopeMax,
        createdAt: inst.createdAt,
        memberCount: inst._count.members,
        owner: inst.members[0]?.user ?? null,
        totalEngaged: memberUserIds.reduce((sum, uid) => sum + (engagedByUser.get(uid) ?? 0), 0),
      };
    });

    return { data, total };
  }

  async countAdminStats() {
    const institutions = await this.prisma.institution.findMany({
      select: {
        members: {
          where: { role: 'OWNER' },
          take: 1,
          select: { user: { select: { kycStatus: true } } },
        },
      },
    });
    const total = institutions.length;
    const verified = institutions.filter((i) => i.members[0]?.user.kycStatus === 'VERIFIED').length;
    const pending = institutions.filter((i) => i.members[0]?.user.kycStatus === 'PENDING').length;

    const allMemberUserIds = (
      await this.prisma.institutionMember.findMany({ select: { userId: true } })
    ).map((m) => m.userId);
    const totalEngagedAgg = await this.prisma.investment.aggregate({
      where: { investorId: { in: allMemberUserIds }, status: { in: [...ENGAGED_INVESTMENT_STATUSES] } },
      _sum: { amountCommitted: true },
    });

    return {
      total,
      verified,
      pending,
      rejected: total - verified - pending,
      totalEngaged: Number(totalEngagedAgg._sum.amountCommitted ?? 0),
    };
  }

  async findByIdAdmin(id: string) {
    const institution = await this.prisma.institution.findUnique({ where: { id } });
    if (!institution) return null;

    const members = await this.findMembersWithStats(id);
    const engagedByUser = await this.aggregateEngagedByUser(members.map((m) => m.userId));
    return {
      ...institution,
      members,
      totalEngaged: members.reduce((sum, m) => sum + (engagedByUser.get(m.userId) ?? 0), 0),
    };
  }

  private async aggregateEngagedByUser(userIds: string[]) {
    const investments = await this.prisma.investment.findMany({
      where: { investorId: { in: userIds }, status: { in: [...ENGAGED_INVESTMENT_STATUSES] } },
      select: { investorId: true, amountCommitted: true },
    });
    const byUser = new Map<string, number>();
    for (const inv of investments) {
      byUser.set(inv.investorId, (byUser.get(inv.investorId) ?? 0) + Number(inv.amountCommitted));
    }
    return byUser;
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

  // Évite les doublons : pas de nouvelle alerte si une alerte du même type sur le
  // même client, pour cette institution, est déjà ouverte (EN_ANALYSE ou BLOQUE).
  async findActiveAmlAlert(institutionId: string, organizationId: string, alertType: AmlAlertType) {
    return this.prisma.amlAlert.findFirst({
      where: { institutionId, organizationId, alertType, status: { in: ['EN_ANALYSE', 'BLOQUE'] } },
    });
  }

  async createAmlAlert(data: Prisma.AmlAlertUncheckedCreateInput) {
    return this.prisma.amlAlert.create({ data });
  }
}
