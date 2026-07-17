import {
  Controller, Get, Post, Put, Patch, Param, Query, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Max, Min, ValidateNested } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ScoringService } from './scoring.service';
import { parsePositiveInt } from '../common/pagination.util';

class ValidateReportDto {
  validatedScore?: number;
  notes?: string;
}

class WeightCriterionDto {
  @IsString()
  key: string;

  @IsInt()
  @Min(1)
  @Max(100)
  weight: number;
}

class UpdateWeightsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeightCriterionDto)
  weights: WeightCriterionDto[];
}

@ApiTags('Scoring')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('scoring')
export class ScoringController {
  constructor(private scoringService: ScoringService) {}

  @ApiOperation({ summary: '[ADMIN] Dashboard scoring — dossiers à traiter', description: 'Recherche par PME, filtre par produit, avec pagination.' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'product', required: false, enum: ['FACTURE', 'PRET', 'EQUITY'] })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page (retourne tout si absent)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Taille de page (retourne tout si absent)' })
  @Get('dashboard')
  getDashboard(
    @Query('search') search?: string,
    @Query('product') product?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.scoringService.getDashboard({
      search,
      product,
      page: parsePositiveInt(page),
      limit: parsePositiveInt(limit),
    });
  }

  @ApiOperation({ summary: '[ADMIN] Stats du dashboard scoring (à scorer, en analyse, scoré, à compléter)' })
  @Get('dashboard/stats')
  getDashboardStats() {
    return this.scoringService.getDashboardStats();
  }

  @ApiOperation({ summary: '[ADMIN] Nombre de dossiers nécessitant une action (à scorer ou en erreur)' })
  @Get('pending-count')
  async getPendingCount() {
    const { data } = await this.scoringService.getDashboard();
    const count = data.filter((d) =>
      ['A_SCORER', 'ERREUR_CALCUL'].includes(d.scoringStatus),
    ).length;
    return { count };
  }

  @ApiOperation({ summary: '[ADMIN] Historique des rapports de scoring', description: 'Recherche par PME, avec pagination.' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page (retourne tout si absent)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Taille de page (retourne tout si absent)' })
  @Get('history')
  getHistory(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.scoringService.getHistory({
      search,
      page: parsePositiveInt(page),
      limit: parsePositiveInt(limit),
    });
  }

  @ApiOperation({ summary: '[ADMIN] Stats de l\'historique de scoring' })
  @Get('history/stats')
  getHistoryStats() {
    return this.scoringService.getHistoryStats();
  }

  @ApiOperation({ summary: '[ADMIN] Déclencher manuellement le scoring d\'une demande' })
  @ApiParam({ name: 'fundingRequestId', description: 'UUID de la demande' })
  @Post('compute/:fundingRequestId')
  async computeManual(@Param('fundingRequestId') fundingRequestId: string) {
    await this.scoringService.computeForAdmin(fundingRequestId);
    return { message: 'Scoring lancé avec succès.' };
  }

  @ApiOperation({ summary: '[ADMIN] Déclencher manuellement le calcul du score PME indépendant' })
  @ApiParam({ name: 'organizationId', description: 'UUID de la PME' })
  @Post('compute-organisation/:organizationId')
  async computeManualOrganization(@Param('organizationId') organizationId: string) {
    await this.scoringService.computeForAdminOrganization(organizationId);
    return { message: 'Scoring PME lancé avec succès.' };
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

  @ApiOperation({ summary: '[ADMIN] Récupérer les pondérations de scoring configurées (par produit)' })
  @Get('weights')
  getWeights() {
    return this.scoringService.getWeightConfigs();
  }

  @ApiOperation({ summary: '[ADMIN] Mettre à jour les pondérations de scoring d\'un produit' })
  @ApiParam({ name: 'product', description: 'FACTURE | PRET | EQUITY' })
  @Put('weights/:product')
  async updateWeights(@Param('product') product: string, @Body() dto: UpdateWeightsDto) {
    await this.scoringService.updateWeights(product, dto.weights);
    return { message: 'Pondérations mises à jour avec succès.' };
  }
}
