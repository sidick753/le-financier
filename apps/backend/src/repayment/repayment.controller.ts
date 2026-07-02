import { Body, Controller, Get, Param, Post, UseGuards, Request } from '@nestjs/common';
import { RepaymentService } from './repayment.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('repayments')
export class RepaymentController {
  constructor(private repaymentService: RepaymentService) {}

  @Get('my-schedule')
  getMySchedule(@Request() req) {
    return this.repaymentService.getMySchedule(req.user.id);
  }

  @Get('my-payments')
  getMyPayments(@Request() req) {
    return this.repaymentService.getMyPayments(req.user.id);
  }

  @Get('funding-request/:fundingRequestId')
  getScheduleForFundingRequest(@Param('fundingRequestId') id: string) {
    return this.repaymentService.getScheduleForFundingRequest(id);
  }

  @Post('schedule/:scheduleId/confirm')
  confirmPayment(
    @Param('scheduleId') scheduleId: string,
    @Body() dto: ConfirmPaymentDto,
    @Request() req,
  ) {
    return this.repaymentService.confirmPayment(scheduleId, dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/commissions')
  getAllCommissions() {
    return this.repaymentService.getAllCommissions();
  }
}
