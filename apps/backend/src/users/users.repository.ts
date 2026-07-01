import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@le-financier/database';
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

  async create(data: CreateUserData) {
    return this.prisma.user.create({ data });
  }

  async findAll(filters?: { role?: string }) {
    return this.prisma.user.findMany({
      where: filters?.role ? { role: filters.role as any } : {},
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
    });
  }

  async updateKycStatus(id: string, status: 'VERIFIED' | 'REJECTED') {
    return this.prisma.user.update({
      where: { id },
      data: { kycStatus: status },
    });
  }
}
