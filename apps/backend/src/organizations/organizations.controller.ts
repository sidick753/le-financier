import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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

  @ApiOperation({ summary: '[Admin] Stats PME', description: 'Retourne les compteurs globaux : total, vérifiées, en attente, rejetées.' })
  @ApiResponse({ status: 200, description: '{ total, verified, pending, rejected }' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/stats')
  getAdminStats() {
    return this.organizationsService.getAdminStats();
  }

  @ApiOperation({ summary: '[Admin] Liste toutes les PME', description: 'Filtre optionnel par statut de vérification et recherche par nom.' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'VERIFIED', 'REJECTED'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Liste des organisations' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/all')
  getAllOrganizations(@Query('status') status?: string, @Query('search') search?: string) {
    return this.organizationsService.getAllOrganizations({ status, search });
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
  rejectOrganization(@Param('id') id: string) {
    return this.organizationsService.updateVerificationStatus(id, 'REJECTED');
  }

  @ApiOperation({ summary: '[Admin] Suspendre une PME' })
  @ApiParam({ name: 'id', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour à REJECTED (suspendu)' })
  @ApiResponse({ status: 404, description: 'Organisation introuvable' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('admin/:id/suspend')
  suspendOrganization(@Param('id') id: string) {
    return this.organizationsService.updateVerificationStatus(id, 'REJECTED');
  }
}
