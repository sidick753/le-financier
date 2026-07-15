import { Body, Controller, Get, Param, Post, Patch, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { FundingService } from './funding.service';
import { CreateFundingRequestDto } from './dto/create-funding-request.dto';
import { UpdateFundingRequestDto } from './dto/update-funding-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RejectionReasonDto } from '../common/dto/rejection-reason.dto';
import { parsePositiveInt } from '../common/pagination.util';

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

  @ApiOperation({ summary: 'Demandes publiées (public)', description: 'Retourne les demandes en statut PUBLISHED. Endpoint public — aucun token requis.' })
  @ApiQuery({ name: 'category', required: false, enum: ['FACTURE', 'PRET', 'EQUITY'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['recent', 'amount_desc', 'amount_asc', 'return_desc', 'closing_soon'],
    description: 'Tri (défaut : recent = date de création décroissante)',
  })
  @ApiQuery({
    name: 'risk',
    required: false,
    enum: ['FAIBLE', 'MODERE', 'ELEVE', 'NON_NOTE'],
    description: 'Filtre par niveau de risque (grade du dernier rapport de scoring)',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page (retourne tout si absent)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Taille de page (retourne tout si absent)' })
  @ApiResponse({ status: 200, description: '{ data: FundingRequest[], total: number }' })
  @Get('published')
  findAllPublished(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('risk') risk?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.fundingService.findAllPublished({
      category,
      search,
      sort,
      risk,
      page: parsePositiveInt(page),
      limit: parsePositiveInt(limit),
    });
  }

  @ApiOperation({
    summary: 'Détail d\'une demande',
    description: "Retourne une demande avec son organisation et son scoring. Accès public si la demande est PUBLISHED/FUNDED/CLOSED (investisseurs) ; sinon réservé aux membres de l'organisation propriétaire (token requis).",
  })
  @ApiParam({ name: 'id', description: 'UUID de la demande' })
  @ApiResponse({ status: 200, description: 'Détail de la demande' })
  @ApiResponse({ status: 403, description: "Demande non publique et vous n'en êtes pas membre" })
  @ApiResponse({ status: 404, description: 'Demande introuvable' })
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.fundingService.findOneWithDetails(id, req.user?.id);
  }

  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Modifier une demande',
    description: "Modifie les champs d'une demande de financement. Réservé au membre de l'organisation propriétaire, et uniquement tant que la demande n'a jamais été publiée (statut DRAFT ou UNDER_REVIEW).",
  })
  @ApiParam({ name: 'id', description: 'UUID de la demande' })
  @ApiResponse({ status: 200, description: 'Demande mise à jour' })
  @ApiResponse({ status: 400, description: 'Demande déjà publiée — non modifiable' })
  @ApiResponse({ status: 403, description: 'Pas membre de l\'organisation propriétaire' })
  @ApiResponse({ status: 404, description: 'Demande introuvable' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFundingRequestDto, @Request() req) {
    return this.fundingService.update(id, dto, req.user.id);
  }

  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Supprimer une demande',
    description: "Supprime définitivement une demande de financement. Réservé au membre de l'organisation propriétaire, et uniquement tant que la demande n'a jamais été publiée (statut DRAFT ou UNDER_REVIEW).",
  })
  @ApiParam({ name: 'id', description: 'UUID de la demande' })
  @ApiResponse({ status: 200, description: 'Demande supprimée' })
  @ApiResponse({ status: 400, description: 'Demande déjà publiée — non supprimable' })
  @ApiResponse({ status: 403, description: 'Pas membre de l\'organisation propriétaire' })
  @ApiResponse({ status: 404, description: 'Demande introuvable' })
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.fundingService.remove(id, req.user.id);
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
  reject(@Param('id') id: string, @Body() dto: RejectionReasonDto) {
    return this.fundingService.reject(id, dto.reason);
  }

  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Rapport de scoring d\'une demande' })
  @ApiParam({ name: 'id', description: 'UUID de la demande' })
  @ApiResponse({ status: 200, description: 'Rapport de scoring calculé' })
  @ApiResponse({ status: 404, description: 'Pas encore calculé' })
  @UseGuards(JwtAuthGuard)
  @Get(':id/scoring')
  getScoringReport(@Param('id') id: string) {
    return this.fundingService.getScoringReport(id);
  }

  @ApiOperation({ summary: '[Admin] Statistiques des opportunités', description: 'Retourne les compteurs globaux : total, publiées, en financement, clôturées, montant total levé.' })
  @ApiResponse({ status: 200, description: '{ total, published, funded, closed, totalRaised }' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/stats')
  getAdminStats() {
    return this.fundingService.getAdminStats();
  }

  @ApiOperation({ summary: '[Admin] Liste toutes les opportunités', description: 'Filtre optionnel par statut et recherche par titre/PME, avec pagination.' })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'UNDER_REVIEW', 'PUBLISHED', 'FUNDED', 'CLOSED', 'REJECTED', 'CANCELLED'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page (retourne tout si absent)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Taille de page (retourne tout si absent)' })
  @ApiResponse({ status: 200, description: '{ data: FundingRequest[], total: number }' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/all')
  findAllAdmin(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.fundingService.findAllForAdmin({
      status,
      search,
      page: parsePositiveInt(page),
      limit: parsePositiveInt(limit),
    });
  }

  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: '[Admin] Détail complet d\'une demande', description: 'Retourne la demande avec son organisation, ses documents et ses rapports de scoring. Réservé aux rôles ADMIN et SUPER_ADMIN.' })
  @ApiParam({ name: 'id', description: 'UUID de la demande' })
  @ApiResponse({ status: 200, description: 'Demande trouvée' })
  @ApiResponse({ status: 404, description: 'Demande introuvable' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/:id')
  findOneAdmin(@Param('id') id: string) {
    return this.fundingService.findOneAdmin(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.fundingService.cancel(id);
  }

  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: '[ADMIN] Réactiver (CANCELLED → PUBLISHED)',
    description: 'Republie une demande suspendue — de nouveau visible par les investisseurs. Réservé aux rôles ADMIN et SUPER_ADMIN.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la demande' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour → PUBLISHED' })
  @ApiResponse({ status: 400, description: 'La demande n\'est pas suspendue' })
  @ApiResponse({ status: 403, description: 'Rôle insuffisant' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.fundingService.reactivate(id);
  }

  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: '[ADMIN] Décaisser vers la PME (FUNDED → CLOSED)',
    description: `Verse les fonds accumulés (validés admin) à la PME, commission de financement déduite.
- Réservé aux dossiers en statut **FUNDED** (100% des virements validés).
- \`disbursedAmount\` = \`amountRaised\` - somme des commissions FUNDING_FEE en attente sur ce dossier.
- Les commissions correspondantes passent en \`COLLECTED\`.`,
  })
  @ApiParam({ name: 'id', description: 'UUID de la demande' })
  @ApiResponse({ status: 200, description: 'Décaissé — statut mis à jour → CLOSED' })
  @ApiResponse({ status: 400, description: 'La demande n\'est pas en FUNDED' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/disburse')
  disburse(@Param('id') id: string, @Request() req) {
    return this.fundingService.disburse(id, req.user.id);
  }
}
