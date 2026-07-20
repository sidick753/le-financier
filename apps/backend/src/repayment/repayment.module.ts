import { Module } from '@nestjs/common';
import { RepaymentController } from './repayment.controller';
import { RepaymentService } from './repayment.service';
import { RepaymentRepository } from './repayment.repository';
import { FundingModule } from '../funding/funding.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PayoutClaimsModule } from '../payout-claims/payout-claims.module';
import { InstitutionsModule } from '../institutions/institutions.module';

@Module({
  imports: [FundingModule, OrganizationsModule, NotificationsModule, PayoutClaimsModule, InstitutionsModule],
  controllers: [RepaymentController],
  providers: [RepaymentService, RepaymentRepository],
  exports: [RepaymentService],
})
export class RepaymentModule {}
