import { User } from '@le-financier/database';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: User['role'];
  phone?: string;
  cniNumber?: string;
}

export type PublicUser = Omit<User, 'passwordHash' | 'twoFaEnabled' | 'updatedAt'>;

export interface IUsersRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findAdminIds(): Promise<string[]>;
  findByIdAdmin(id: string): Promise<any | null>;
  findAll(filters?: {
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }>;
  getInvestorStats(): Promise<{
    total: number;
    institutions: number;
    particuliers: number;
    pendingKyc: number;
    totalEngaged: number;
  }>;
  create(data: CreateUserData): Promise<User>;
  findByIdPublic(id: string): Promise<PublicUser | null>;
  updateProfile(id: string, data: { firstName?: string; lastName?: string; phone?: string; cniNumber?: string }): Promise<PublicUser>;
  updateKycStatus(id: string, status: 'VERIFIED' | 'REJECTED'): Promise<PublicUser>;
  updatePassword(id: string, passwordHash: string): Promise<User>;
  createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<any>;
  findRefreshToken(token: string): Promise<any>;
  revokeRefreshToken(token: string): Promise<any>;
  revokeAllUserRefreshTokens(userId: string): Promise<any>;
}
