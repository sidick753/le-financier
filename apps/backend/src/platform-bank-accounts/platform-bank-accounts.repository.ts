import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@le-financier/database';
import {
  IPlatformBankAccountsRepository,
  CreatePlatformBankAccountData,
  UpdatePlatformBankAccountData,
} from './interfaces/platform-bank-accounts-repository.interface';

@Injectable()
export class PlatformBankAccountsRepository implements IPlatformBankAccountsRepository {
  private prisma = new PrismaClient();

  async create(data: CreatePlatformBankAccountData) {
    return this.prisma.platformBankAccount.create({ data });
  }

  async findAll() {
    return this.prisma.platformBankAccount.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findActive() {
    return this.prisma.platformBankAccount.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.platformBankAccount.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdatePlatformBankAccountData) {
    return this.prisma.platformBankAccount.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.platformBankAccount.delete({ where: { id } });
  }
}
