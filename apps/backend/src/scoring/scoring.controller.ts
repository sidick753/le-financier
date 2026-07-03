import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ScoringService } from './scoring.service';

class ValidateReportDto {
  validatedScore?: number;
  notes?: string;
}

@ApiTags('Scoring')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('scoring')
export class ScoringController {
  constructor(private scoringService: ScoringService) {}

  @ApiOperation({ summary: '[ADMIN] Dashboard scoring — dossiers à traiter' })
  @Get('dashboard')
  getDashboard() {
    return this.scoringService.getDashboard();
  }

  @ApiOperation({ summary: '[ADMIN] Historique des rapports de scoring' })
  @Get('history')
  getHistory() {
    return this.scoringService.getHistory();
  }

  @ApiOperation({ summary: '[ADMIN] Déclencher manuellement le scoring d\'une demande' })
  @ApiParam({ name: 'fundingRequestId', description: 'UUID de la demande' })
  @Post('compute/:fundingRequestId')
  async computeManual(@Param('fundingRequestId') fundingRequestId: string) {
    await this.scoringService.computeForAdmin(fundingRequestId);
    return { message: 'Scoring lancé avec succès.' };
  }

  @ApiOperation({ summary: '[ADMIN] Détail complet d\'un rapport de scoring' })
  @ApiParam({ name: 'reportId', description: 'UUID du rapport' })
  @Get('report/:reportId')
  getReport(@Param('reportId') reportId: string) {
    return this.scoringService.getReportById(reportId);
  }

  @ApiOperation({ summary: '[ADMIN] Valider un rapport de scoring' })
  @ApiParam({ name: 'reportId', description: 'UUID du rapport' })
  @Patch('report/:reportId/validate')
  validateReport(
    @Param('reportId') reportId: string,
    @Body() dto: ValidateReportDto,
    @Request() req,
  ) {
    return this.scoringService.validateReport(
      reportId,
      req.user.id,
      dto.validatedScore,
      dto.notes,
    );
  }
}
