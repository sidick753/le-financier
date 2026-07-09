import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InstitutionsService } from './institutions.service';
import { UpdateInstitutionProfileDto } from './dto/update-institution-profile.dto';
import { UpdateInstitutionLimitsDto } from './dto/update-institution-limits.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@ApiTags('Institutions')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('INSTITUTION')
@Controller('institutions')
export class InstitutionsController {
  constructor(private institutionsService: InstitutionsService) {}

  @ApiOperation({ summary: 'Profil de mon institution', description: 'Créé automatiquement au premier accès.' })
  @Get('mine')
  getMine(@Request() req) {
    return this.institutionsService.getMine(req.user.id);
  }

  @ApiOperation({ summary: 'Mettre à jour le profil institutionnel' })
  @Patch('mine')
  updateProfile(@Body() dto: UpdateInstitutionProfileDto, @Request() req) {
    return this.institutionsService.updateProfile(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Mettre à jour les limites et mandats d\'investissement' })
  @Patch('mine/limits')
  updateLimits(@Body() dto: UpdateInstitutionLimitsDto, @Request() req) {
    return this.institutionsService.updateLimits(req.user.id, dto);
  }

  @ApiOperation({
    summary: 'Régénérer la clé API',
    description: 'La clé en clair n\'est retournée qu\'une seule fois dans cette réponse — elle ne sera plus jamais restituée ensuite.',
  })
  @Post('mine/api-key/regenerate')
  regenerateApiKey(@Request() req) {
    return this.institutionsService.regenerateApiKey(req.user.id);
  }

  @ApiOperation({ summary: 'Membres de mon institution', description: 'Inclut dossiers actifs et encours géré par membre.' })
  @Get('mine/members')
  getMembers(@Request() req) {
    return this.institutionsService.getMembers(req.user.id);
  }

  @ApiOperation({
    summary: 'Inviter un membre',
    description: "Réservé au propriétaire. Retourne un mot de passe temporaire — aucun email n'est envoyé automatiquement.",
  })
  @Post('mine/members/invite')
  inviteMember(@Body() dto: InviteMemberDto, @Request() req) {
    return this.institutionsService.inviteMember(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Modifier un membre', description: 'Réservé au propriétaire.' })
  @ApiParam({ name: 'memberId', description: 'UUID du membre' })
  @Patch('mine/members/:memberId')
  updateMember(@Param('memberId') memberId: string, @Body() dto: UpdateMemberDto, @Request() req) {
    return this.institutionsService.updateMember(req.user.id, memberId, dto);
  }

  @ApiOperation({ summary: 'Retirer un membre', description: 'Réservé au propriétaire.' })
  @ApiParam({ name: 'memberId', description: 'UUID du membre' })
  @Delete('mine/members/:memberId')
  removeMember(@Param('memberId') memberId: string, @Request() req) {
    return this.institutionsService.removeMember(req.user.id, memberId);
  }

  @ApiOperation({
    summary: 'Indicateurs de risque et de conformité',
    description: 'Calculés à partir des données réelles de la plateforme. Les ratios bancaires (LCR, CAR, levier) ne sont pas disponibles (données de bilan hors plateforme).',
  })
  @Get('mine/risk-indicators')
  getRiskIndicators(@Request() req) {
    return this.institutionsService.getRiskIndicators(req.user.id);
  }

  @ApiOperation({
    summary: 'Alertes AML / LAB-CFT',
    description: 'Alertes de conformité (transaction inhabituelle, PEP détecté, bénéficiaire non identifié) et statistiques associées.',
  })
  @Get('mine/aml-alerts')
  getAmlAlerts(@Request() req) {
    return this.institutionsService.getAmlAlerts(req.user.id);
  }

  @ApiOperation({ summary: 'Marquer une alerte AML comme traitée' })
  @ApiParam({ name: 'alertId', description: 'UUID de l\'alerte' })
  @Patch('mine/aml-alerts/:alertId/resolve')
  resolveAmlAlert(@Param('alertId') alertId: string, @Request() req) {
    return this.institutionsService.resolveAmlAlert(req.user.id, alertId);
  }

  // ── Admin (partenaires) ────────────────────────────────────────────────
  // Ces routes ciblent l'ADMIN plateforme, pas un membre d'institution —
  // le rôle requis surcharge donc le `@Roles('INSTITUTION')` de la classe.

  @ApiOperation({ summary: '[Admin] Liste tous les partenaires institutionnels', description: 'Filtre optionnel par recherche sur le nom et par statut KYC du propriétaire, avec pagination.' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'VERIFIED', 'REJECTED'] })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page (retourne tout si absent)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Taille de page (retourne tout si absent)' })
  @ApiResponse({ status: 200, description: '{ data: Institution[], total: number }' })
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/all')
  getAllAdmin(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.institutionsService.getAllAdmin({
      search,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @ApiOperation({ summary: '[Admin] Statistiques partenaires', description: 'Retourne les compteurs globaux : total, vérifiés, en attente, rejetés, volume engagé.' })
  @ApiResponse({ status: 200, description: '{ total, verified, pending, rejected, totalEngaged }' })
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/stats')
  getAdminStats() {
    return this.institutionsService.getAdminStats();
  }

  @ApiOperation({ summary: '[Admin] Détail complet d\'un partenaire institutionnel', description: 'Retourne l\'institution avec tous ses membres et leurs statistiques d\'engagement.' })
  @ApiParam({ name: 'id', description: 'UUID de l\'institution' })
  @ApiResponse({ status: 200, description: 'Institution trouvée' })
  @ApiResponse({ status: 404, description: 'Institution introuvable' })
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/:id')
  getOneAdmin(@Param('id') id: string) {
    return this.institutionsService.getOneAdmin(id);
  }
}
