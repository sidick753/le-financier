import { Body, Controller, Get, Param, Post, Patch, UseGuards, Request } from '@nestjs/common';
import { InvestmentsService } from './investments.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { SettleInvestmentDto } from './dto/settle-investment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(private investmentsService: InvestmentsService) {}

  @Post()
  create(@Body() dto: CreateInvestmentDto, @Request() req) {
    return this.investmentsService.create(dto, req.user.id);
  }

  @Get('mine')
  findMine(@Request() req) {
    return this.investmentsService.findMine(req.user.id);
  }

  @Get('funding-request/:fundingRequestId')
  findAllForFundingRequest(@Param('fundingRequestId') fundingRequestId: string) {
    return this.investmentsService.findAllForFundingRequest(fundingRequestId);
  }

  @Patch(':id/settle')
  settle(@Param('id') id: string, @Body() dto: SettleInvestmentDto, @Request() req) {
    return this.investmentsService.settle(id, dto, req.user.id);
  }
}
