import { Body, Controller, Get, Param, Post, Patch, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { FundingService } from './funding.service';
import { CreateFundingRequestDto } from './dto/create-funding-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Funding Requests')
@Controller('funding-requests')
export class FundingController {
  constructor(private fundingService: FundingService) {}

  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Créer une demande (statut DRAFT)',
    description: 'Crée une demande de financement en brouillon. Appelez ensuite `PATCH /:id/submit` pour la soumettre en révision.',
  })
  @ApiResponse({ status: 201, description: 'Demande créée en statut DRAFT' })
  @ApiResponse({ status: 400, description: 'Champs invalides' })
  @ApiResponse({ status: 403, description: 'Pas membre de l\'organisation' })
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateFundingRequestDto, @Request() req) {
    return this.fundingService.create(dto, req.user.id);
  }

  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Demandes de mon organisation', description: 'Retourne toutes les demandes de financement liées à une organisation dont vous êtes membre.' })
  @ApiParam({ name: 'organizationId', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Liste des demandes avec compteur d\'engagements' })
  @ApiResponse({ status: 403, description: 'Pas membre' })
  @UseGuards(JwtAuthGuard)
  @Get('organization/:organizationId')
  findMineByOrganization(@Param('organizationId') organizationId: string, @Request() req) {
    return this.fundingService.findMineByOrganization(organizationId, req.user.id);
  }

  @ApiOperation({ summary: 'Demandes publiées (public)', description: 'Retourne toutes les demandes en statut PUBLISHED. Endpoint public — aucun token requis.' })
  @ApiResponse({ status: 200, description: 'Liste des demandes publiées' })
  @Get('published')
  findAllPublished(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.fundingService.findAllPublished({ category, search });
  }

  @ApiOperation({ summary: 'Détail d\'une demande', description: 'Retourne une demande avec son organisation et ses documents.' })
  @ApiParam({ name: 'id', description: 'UUID de la demande' })
  @ApiResponse({ status: 200, description: 'Détail de la demande' })
  @ApiResponse({ status: 404, description: 'Demande introuvable' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fundingService.findOneWithDetails(id);
  }

  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Soumettre pour révision (DRAFT → UNDER_REVIEW)',
    description: 'Envoie la demande en révision chez l\'équipe LeFinancier. La demande doit être en statut DRAFT.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la demande' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour → UNDER_REVIEW' })
  @ApiResponse({ status: 400, description: 'La demande n\'est pas en DRAFT' })
  @ApiResponse({ status: 403, description: 'Pas membre de l\'organisation propriétaire' })
  @ApiResponse({ status: 404, description: 'Demande introuvable' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id/submit')
  submitForReview(@Param('id') id: string, @Request() req) {
    return this.fundingService.submitForReview(id, req.user.id);
  }

  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: '[ADMIN] Approuver (UNDER_REVIEW → PUBLISHED)',
    description: 'Publie la demande sur la plateforme — visible par les investisseurs. Réservé aux rôles ADMIN et SUPER_ADMIN.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la demande' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour → PUBLISHED' })
  @ApiResponse({ status: 400, description: 'La demande n\'est pas en UNDER_REVIEW' })
  @ApiResponse({ status: 403, description: 'Rôle insuffisant' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.fundingService.approve(id);
  }

  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: '[ADMIN] Rejeter (UNDER_REVIEW → REJECTED)',
    description: 'Rejette la demande. Réservé aux rôles ADMIN et SUPER_ADMIN.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la demande' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour → REJECTED' })
  @ApiResponse({ status: 403, description: 'Rôle insuffisant' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.fundingService.reject(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/all')
  findAllAdmin() {
    return this.fundingService.findAllForAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.fundingService.cancel(id);
  }
}
