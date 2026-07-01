import { Module } from '@nestjs/common';
import { RepaymentController } from './repayment.controller';
import { RepaymentService } from './repayment.service';
import { RepaymentRepository } from './repayment.repository';

@Module({
  controllers: [RepaymentController],
  providers: [RepaymentService, RepaymentRepository],
  exports: [RepaymentService],
})
export class RepaymentModule {}
