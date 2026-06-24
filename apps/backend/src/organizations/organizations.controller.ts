import { Body, Controller, Get, Param, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
}
