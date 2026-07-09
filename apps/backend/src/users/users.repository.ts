import { Injectable } from '@nestjs/common';
import { PrismaClient, Prisma } from '@le-financier/database';
import { IUsersRepository, CreateUserData } from './interfaces/users-repository.interface';

@Injectable()
export class UsersRepository implements IUsersRepository {
  private prisma = new PrismaClient();

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByIdAdmin(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        kycStatus: true,
        isActive: true,
        createdAt: true,
        investments: {
          select: {
            id: true,
            amountCommitted: true,
            lockedReturn: true,
            status: true,
            createdAt: true,
            fundingRequest: {
              select: { id: true, title: true, category: true, status: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        institutionMembership: {
          select: {
            role: true,
            specialty: true,
            status: true,
            institution: { select: { id: true, name: true, type: true } },
          },
        },
      },
    });
  }

  async create(data: CreateUserData) {
    return this.prisma.user.create({ data });
  }

  async findAll(filters?: { role?: string; search?: string; page?: number; limit?: number }) {
    const roles = filters?.role?.split(',').filter(Boolean);
    const where: Prisma.UserWhereInput = {
      ...(roles?.length ? { role: roles.length > 1 ? { in: roles as any } : (roles[0] as any) } : {}),
      ...(filters?.search
        ? {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const { page, limit } = filters ?? {};
    const hasPagination = page !== undefined && limit !== undefined;

    const [data, count] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          kycStatus: true,
          isActive: true,
          createdAt: true,
          investments: { select: { amountCommitted: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: hasPagination ? (page - 1) * limit : undefined,
        take: hasPagination ? limit : undefined,
      }),
      hasPagination ? this.prisma.user.count({ where }) : Promise.resolve(undefined),
    ]);

    return { data, total: count ?? data.length };
  }

  async getInvestorStats() {
    const investorRoles: Prisma.UserWhereInput = { role: { in: ['INVESTOR', 'INSTITUTION'] } };
    const [total, institutions, particuliers, pendingKyc, committed] = await Promise.all([
      this.prisma.user.count({ where: investorRoles }),
      this.prisma.user.count({ where: { role: 'INSTITUTION' } }),
      this.prisma.user.count({ where: { role: 'INVESTOR' } }),
      this.prisma.user.count({ where: { ...investorRoles, kycStatus: 'PENDING' } }),
      this.prisma.investment.aggregate({
        _sum: { amountCommitted: true },
        where: { status: { in: ['COMMITTED', 'SETTLED_OFF_PLATFORM'] } },
      }),
    ]);
    return {
      total,
      institutions,
      particuliers,
      pendingKyc,
      totalEngaged: Number(committed._sum.amountCommitted ?? 0),
    };
  }

  async updateKycStatus(id: string, status: 'VERIFIED' | 'REJECTED') {
    return this.prisma.user.update({
      where: { id },
      data: { kycStatus: status },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        kycStatus: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async updatePassword(id: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async createRefreshToken(userId: string, token: string, expiresAt: Date) {
    return this.prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }

  async findRefreshToken(token: string) {
    return this.prisma.refreshToken.findUnique({ where: { token } });
  }

  async revokeRefreshToken(token: string) {
    return this.prisma.refreshToken.update({
      where: { token },
      data: { revoked: true },
    });
  }

  async revokeAllUserRefreshTokens(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }
}
