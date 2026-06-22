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
}
