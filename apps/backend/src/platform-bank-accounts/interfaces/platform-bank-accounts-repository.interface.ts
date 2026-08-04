import { PlatformBankAccount } from '@le-financier/database';

export interface CreatePlatformBankAccountData {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  swiftCode?: string;
}

export interface UpdatePlatformBankAccountData {
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  swiftCode?: string;
  isActive?: boolean;
}

export interface IPlatformBankAccountsRepository {
  create(data: CreatePlatformBankAccountData): Promise<PlatformBankAccount>;
  findAll(): Promise<PlatformBankAccount[]>;
  findActive(): Promise<PlatformBankAccount[]>;
  findById(id: string): Promise<PlatformBankAccount | null>;
  update(id: string, data: UpdatePlatformBankAccountData): Promise<PlatformBankAccount>;
  delete(id: string): Promise<PlatformBankAccount>;
}
