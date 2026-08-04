import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Request } from '@nestjs/common';
import { RepaymentService } from './repayment.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RejectionReasonDto } from '../common/dto/rejection-reason.dto';
import { RequestClaimDto } from '../common/dto/request-claim.dto';
import { ApproveClaimDto } from '../common/dto/approve-claim.dto';
import { parsePositiveInt } from '../common/pagination.util';

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
  getScheduleForFundingRequest(@Param('fundingRequestId') id: string, @Request() req) {
    return this.repaymentService.getScheduleForFundingRequest(id, req.user.id, req.user.role);
  }

  @Get('investment/:investmentId')
  getScheduleForInvestment(@Param('investmentId') investmentId: string, @Request() req) {
    return this.repaymentService.getScheduleForInvestment(investmentId, req.user.id);
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
  @Get('admin/pending')
  getPendingPayments() {
    return this.repaymentService.getPendingPayments();
  }

  // Investisseur : montant validé sur cette échéance, pas encore réclamé.
  @Get('schedule/:scheduleId/claimable')
  getClaimableAmount(@Param('scheduleId') scheduleId: string, @Request() req) {
    return this.repaymentService.getClaimableAmount(scheduleId, req.user.id);
  }

  @Get('schedule/:scheduleId/claims')
  getClaimsForSchedule(@Param('scheduleId') scheduleId: string, @Request() req) {
    return this.repaymentService.getClaimsForSchedule(scheduleId, req.user.id);
  }

  // Investisseur : réclame tout ou partie du montant déjà validé sur cette échéance,
  // avant même qu'elle soit intégralement soldée.
  @Post('schedule/:scheduleId/claims')
  requestClaim(
    @Param('scheduleId') scheduleId: string,
    @Body() dto: RequestClaimDto,
    @Request() req,
  ) {
    return this.repaymentService.requestClaim(scheduleId, req.user.id, dto.amount);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/claims/pending')
  getPendingClaims() {
    return this.repaymentService.getPendingClaims();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('claims/:claimId/approve')
  approveClaim(@Param('claimId') claimId: string, @Body() dto: ApproveClaimDto, @Request() req) {
    return this.repaymentService.approveClaim(claimId, req.user.id, dto.proofDocumentId, dto.paidAt);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('claims/:claimId/reject')
  rejectClaim(
    @Param('claimId') claimId: string,
    @Body() dto: RejectionReasonDto,
    @Request() req,
  ) {
    return this.repaymentService.rejectClaim(claimId, req.user.id, dto.reason);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('payment/:paymentId/approve')
  approvePayment(@Param('paymentId') paymentId: string, @Request() req) {
    return this.repaymentService.approvePayment(paymentId, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('payment/:paymentId/reject')
  rejectPayment(
    @Param('paymentId') paymentId: string,
    @Body() dto: RejectionReasonDto,
    @Request() req,
  ) {
    return this.repaymentService.rejectPayment(paymentId, req.user.id, dto.reason);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/commissions')
  getAllCommissions(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.repaymentService.getAllCommissions({
      type,
      status,
      search,
      page: parsePositiveInt(page),
      limit: parsePositiveInt(limit),
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/commissions/stats')
  getCommissionStats() {
    return this.repaymentService.getCommissionStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/commissions/top-organizations')
  getTopOrganizations() {
    return this.repaymentService.getTopOrganizations();
  }
}
