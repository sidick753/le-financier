import { User } from '@le-financier/database';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: User['role'];
  phone?: string;
}

export interface IUsersRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findAll(filters?: { role?: string }): Promise<any[]>;
  create(data: CreateUserData): Promise<User>;
  updateKycStatus(id: string, status: 'VERIFIED' | 'REJECTED'): Promise<User>;
  updatePassword(id: string, passwordHash: string): Promise<User>;
  createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<any>;
  findRefreshToken(token: string): Promise<any>;
  revokeRefreshToken(token: string): Promise<any>;
  revokeAllUserRefreshTokens(userId: string): Promise<any>;
}
