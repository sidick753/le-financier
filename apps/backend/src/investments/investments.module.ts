import { Module } from '@nestjs/common';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';
import { InvestmentsRepository } from './investments.repository';
import { NotificationsModule } from '../notifications/notifications.module';
import { FundingModule } from '../funding/funding.module';

@Module({
  imports: [NotificationsModule, FundingModule],
  controllers: [InvestmentsController],
  providers: [InvestmentsService, InvestmentsRepository],
})
export class InvestmentsModule {}
