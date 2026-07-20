import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateCreditProfileDto } from './dto/update-credit-profile.dto';
import { UpdateBankInfoDto } from './dto/update-bank-info.dto';
import { UpdateIdentityDto } from './dto/update-identity.dto';
import { UpdateComplianceDto } from './dto/update-compliance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RejectionReasonDto } from '../common/dto/rejection-reason.dto';
import { parsePositiveInt } from '../common/pagination.util';

@ApiTags('Organizations')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @ApiOperation({ summary: 'Créer une organisation', description: 'Crée une organisation et désigne l\'utilisateur courant comme OWNER. Le numéro d\'enregistrement (RCCM) doit être unique.' })
  @ApiResponse({ status: 201, description: 'Organisation créée' })
  @ApiResponse({ status: 409, description: 'Numéro d\'enregistrement déjà utilisé' })
  @Post()
  create(@Body() dto: CreateOrganizationDto, @Request() req) {
    return this.organizationsService.create(dto, req.user.id);
  }

  @ApiOperation({ summary: 'Mes organisations', description: 'Retourne toutes les organisations dont l\'utilisateur est membre.' })
  @ApiResponse({ status: 200, description: 'Liste d\'organisations' })
  @Get('mine')
  findMine(@Request() req) {
    return this.organizationsService.findMine(req.user.id);
  }

  @ApiOperation({ summary: 'Détail d\'une organisation', description: 'Retourne une organisation par ID. Accessible uniquement aux membres.' })
  @ApiParam({ name: 'id', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Organisation trouvée' })
  @ApiResponse({ status: 403, description: 'Non membre' })
  @ApiResponse({ status: 404, description: 'Organisation introuvable' })
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.organizationsService.findOneOrThrow(id, req.user.id);
  }

  @ApiOperation({
    summary: 'Mettre à jour le profil de crédit',
    description: 'Secteur, santé financière, profil du dirigeant, équipe/gouvernance/marché — partagés par toutes les demandes de financement de cette PME. Accessible uniquement aux membres.',
  })
  @ApiParam({ name: 'id', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Profil de crédit mis à jour' })
  @ApiResponse({ status: 403, description: 'Non membre' })
  @ApiResponse({ status: 404, description: 'Organisation introuvable' })
  @Patch(':id/credit-profile')
  updateCreditProfile(
    @Param('id') id: string,
    @Body() dto: UpdateCreditProfileDto,
    @Request() req,
  ) {
    return this.organizationsService.updateCreditProfile(id, req.user.id, dto);
  }

  @ApiOperation({
    summary: 'Mettre à jour les informations bancaires',
    description: 'Coordonnées bancaires utilisées pour le versement des fonds levés (prêts et equity), une fois la commission plateforme déduite. Accessible uniquement aux membres.',
  })
  @ApiParam({ name: 'id', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Informations bancaires mises à jour' })
  @ApiResponse({ status: 403, description: 'Non membre' })
  @ApiResponse({ status: 404, description: 'Organisation introuvable' })
  @Patch(':id/bank-info')
  updateBankInfo(
    @Param('id') id: string,
    @Body() dto: UpdateBankInfoDto,
    @Request() req,
  ) {
    return this.organizationsService.updateBankInfo(id, req.user.id, dto);
  }

  @ApiOperation({
    summary: "Mettre à jour l'identité de l'entreprise",
    description: "Secteur (description libre), forme juridique, année de création, ville, adresse — jamais capturés à l'inscription. Accessible uniquement aux membres.",
  })
  @ApiParam({ name: 'id', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Identité mise à jour' })
  @ApiResponse({ status: 403, description: 'Non membre' })
  @ApiResponse({ status: 404, description: 'Organisation introuvable' })
  @Patch(':id/identity')
  updateIdentity(
    @Param('id') id: string,
    @Body() dto: UpdateIdentityDto,
    @Request() req,
  ) {
    return this.organizationsService.updateIdentity(id, req.user.id, dto);
  }

  @ApiOperation({ summary: '[Admin] Stats PME', description: 'Retourne les compteurs globaux : total, vérifiées, en attente, rejetées, montant total financé.' })
  @ApiResponse({ status: 200, description: '{ total, verified, pending, rejected, totalFinanced }' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/stats')
  getAdminStats() {
    return this.organizationsService.getAdminStats();
  }

  @ApiOperation({ summary: '[Admin] Liste toutes les PME', description: 'Filtre optionnel par statut de vérification et recherche par nom, avec pagination.' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'VERIFIED', 'REJECTED'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page (retourne tout si absent)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Taille de page (retourne tout si absent)' })
  @ApiResponse({ status: 200, description: '{ data: Organisation[], total: number }' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/all')
  getAllOrganizations(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.organizationsService.getAllOrganizations({
      status,
      search,
      page: parsePositiveInt(page),
      limit: parsePositiveInt(limit),
    });
  }

  @ApiOperation({ summary: '[Admin] Détail complet d\'une PME', description: 'Retourne l\'organisation avec tous ses membres, demandes de financement, documents et rapports de scoring.' })
  @ApiParam({ name: 'id', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Organisation trouvée' })
  @ApiResponse({ status: 404, description: 'Organisation introuvable' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/:id')
  findOneAdmin(@Param('id') id: string) {
    return this.organizationsService.findOneAdmin(id);
  }

  @ApiOperation({ summary: '[Admin] Vérifier une PME' })
  @ApiParam({ name: 'id', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour à VERIFIED' })
  @ApiResponse({ status: 404, description: 'Organisation introuvable' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('admin/:id/verify')
  verifyOrganization(@Param('id') id: string) {
    return this.organizationsService.updateVerificationStatus(id, 'VERIFIED');
  }

  @ApiOperation({ summary: '[Admin] Rejeter une PME' })
  @ApiParam({ name: 'id', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour à REJECTED' })
  @ApiResponse({ status: 404, description: 'Organisation introuvable' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('admin/:id/reject')
  rejectOrganization(@Param('id') id: string, @Body() dto: RejectionReasonDto) {
    return this.organizationsService.updateVerificationStatus(id, 'REJECTED', dto.reason);
  }

  @ApiOperation({ summary: '[Admin] Suspendre une PME' })
  @ApiParam({ name: 'id', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour à REJECTED (suspendu)' })
  @ApiResponse({ status: 404, description: 'Organisation introuvable' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('admin/:id/suspend')
  suspendOrganization(@Param('id') id: string, @Body() dto: RejectionReasonDto) {
    return this.organizationsService.updateVerificationStatus(id, 'REJECTED', dto.reason);
  }

  @ApiOperation({
    summary: '[Admin] Statut de conformité LAB-CFT',
    description: 'Marque le dirigeant comme personne politiquement exposée (PEP), saisi manuellement à la revue KYC. Alimente le moteur d\'alertes AML de l\'institution investisseuse.',
  })
  @ApiParam({ name: 'id', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Statut de conformité mis à jour' })
  @ApiResponse({ status: 404, description: 'Organisation introuvable' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('admin/:id/compliance')
  updateCompliance(@Param('id') id: string, @Body() dto: UpdateComplianceDto) {
    return this.organizationsService.updateCompliance(id, dto);
  }
}
