import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
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
}
