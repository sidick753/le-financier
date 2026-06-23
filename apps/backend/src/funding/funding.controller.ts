import { Body, Controller, Get, Param, Post, Patch, UseGuards, Request } from '@nestjs/common';
import { FundingService } from './funding.service';
import { CreateFundingRequestDto } from './dto/create-funding-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('funding-requests')
export class FundingController {
  constructor(private fundingService: FundingService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateFundingRequestDto, @Request() req) {
    return this.fundingService.create(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('organization/:organizationId')
  findMineByOrganization(@Param('organizationId') organizationId: string, @Request() req) {
    return this.fundingService.findMineByOrganization(organizationId, req.user.id);
  }

  @Get('published')
  findAllPublished() {
    return this.fundingService.findAllPublished();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/submit')
  submitForReview(@Param('id') id: string, @Request() req) {
    return this.fundingService.submitForReview(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.fundingService.approve(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.fundingService.reject(id);
  }
}
