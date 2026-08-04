import { Module } from '@nestjs/common';
import { PlatformBankAccountsController } from './platform-bank-accounts.controller';
import { PlatformBankAccountsService } from './platform-bank-accounts.service';
import { PlatformBankAccountsRepository } from './platform-bank-accounts.repository';

@Module({
  controllers: [PlatformBankAccountsController],
  providers: [PlatformBankAccountsService, PlatformBankAccountsRepository],
  exports: [PlatformBankAccountsService],
})
export class PlatformBankAccountsModule {}
