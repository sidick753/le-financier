import { Module, forwardRef } from '@nestjs/common';
import { FundingController } from './funding.controller';
import { FundingService } from './funding.service';
import { FundingRepository } from './funding.repository';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ScoringModule } from '../scoring/scoring.module';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PayoutClaimsModule } from '../payout-claims/payout-claims.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { PlatformBankAccountsModule } from '../platform-bank-accounts/platform-bank-accounts.module';

@Module({
  imports: [
    OrganizationsModule,
    ScoringModule,
    forwardRef(() => DocumentsModule),
    NotificationsModule,
    PayoutClaimsModule,
    InstitutionsModule,
    PlatformBankAccountsModule,
  ],
  controllers: [FundingController],
  providers: [FundingService, FundingRepository],
  exports: [FundingRepository],
})
export class FundingModule {}
