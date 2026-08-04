import { Module } from '@nestjs/common';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';
import { InvestmentsRepository } from './investments.repository';
import { NotificationsModule } from '../notifications/notifications.module';
import { FundingModule } from '../funding/funding.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { RepaymentModule } from '../repayment/repayment.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [NotificationsModule, FundingModule, OrganizationsModule, RepaymentModule, InstitutionsModule, UsersModule],
  controllers: [InvestmentsController],
  providers: [InvestmentsService, InvestmentsRepository],
})
export class InvestmentsModule {}
