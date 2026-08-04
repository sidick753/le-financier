import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { RepaymentModule } from '../repayment/repayment.module';
import { FundingModule } from '../funding/funding.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [RepaymentModule, FundingModule, NotificationsModule],
  providers: [RemindersService],
})
export class RemindersModule {}
