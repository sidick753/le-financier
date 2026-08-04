import { Injectable, NotFoundException } from '@nestjs/common';
import { PlatformBankAccountsRepository } from './platform-bank-accounts.repository';
import { CreatePlatformBankAccountDto } from './dto/create-platform-bank-account.dto';
import { UpdatePlatformBankAccountDto } from './dto/update-platform-bank-account.dto';

@Injectable()
export class PlatformBankAccountsService {
  constructor(private platformBankAccountsRepository: PlatformBankAccountsRepository) {}

  create(dto: CreatePlatformBankAccountDto) {
    return this.platformBankAccountsRepository.create(dto);
  }

  findAll() {
    return this.platformBankAccountsRepository.findAll();
  }

  // Utilisé par FundingService pour révéler les coordonnées de virement à un
  // investisseur dont l'engagement est confirmé — jamais les comptes de la PME.
  findActive() {
    return this.platformBankAccountsRepository.findActive();
  }

  async update(id: string, dto: UpdatePlatformBankAccountDto) {
    const account = await this.platformBankAccountsRepository.findById(id);
    if (!account) {
      throw new NotFoundException('Compte bancaire introuvable.');
    }
    return this.platformBankAccountsRepository.update(id, dto);
  }

  async remove(id: string) {
    const account = await this.platformBankAccountsRepository.findById(id);
    if (!account) {
      throw new NotFoundException('Compte bancaire introuvable.');
    }
    await this.platformBankAccountsRepository.delete(id);
    return { success: true };
  }
}
