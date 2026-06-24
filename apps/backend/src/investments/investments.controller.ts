import { Body, Controller, Get, Param, Post, Patch, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { InvestmentsService } from './investments.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { SettleInvestmentDto } from './dto/settle-investment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Investments')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(private investmentsService: InvestmentsService) {}

  @ApiOperation({
    summary: 'Créer un engagement (COMMITTED)',
    description: `Crée un engagement sur une demande publiée.
- La demande doit être en statut **PUBLISHED**.
- Le montant \`amountCommitted\` + engagements actifs existants ne peut pas dépasser \`amountRequested\`.
- La transaction utilise un verrou en base pour éviter les dépassements concurrents.
- Envoie une notification in-app au propriétaire de la PME.`,
  })
  @ApiResponse({ status: 201, description: 'Engagement créé en statut COMMITTED' })
  @ApiResponse({ status: 409, description: 'Demande fermée ou montant dépassé' })
  @Post()
  create(@Body() dto: CreateInvestmentDto, @Request() req) {
    return this.investmentsService.create(dto, req.user.id);
  }

  @ApiOperation({ summary: 'Mes engagements', description: 'Retourne tous les engagements de l\'investisseur courant.' })
  @ApiResponse({ status: 200, description: 'Liste d\'engagements' })
  @Get('mine')
  findMine(@Request() req) {
    return this.investmentsService.findMine(req.user.id);
  }

  @ApiOperation({ summary: 'Engagements d\'une demande', description: 'Retourne tous les engagements liés à une demande de financement spécifique.' })
  @ApiParam({ name: 'fundingRequestId', description: 'UUID de la demande de financement' })
  @ApiResponse({ status: 200, description: 'Liste d\'engagements' })
  @Get('funding-request/:fundingRequestId')
  findAllForFundingRequest(@Param('fundingRequestId') fundingRequestId: string) {
    return this.investmentsService.findAllForFundingRequest(fundingRequestId);
  }

  @ApiOperation({ summary: 'Engagements reçus par une organisation', description: 'Retourne tous les engagements sur les demandes d\'une organisation. Accessible uniquement aux membres.' })
  @ApiParam({ name: 'organizationId', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Liste d\'engagements avec investisseur et demande inclus' })
  @ApiResponse({ status: 403, description: 'Pas membre' })
  @Get('organization/:organizationId')
  findAllForOrganization(@Param('organizationId') organizationId: string, @Request() req) {
    return this.investmentsService.findAllForOrganization(organizationId, req.user.id);
  }

  @ApiOperation({
    summary: 'Confirmer un engagement (COMMITTED → SETTLED_OFF_PLATFORM)',
    description: `L'investisseur confirme le virement hors plateforme en fournissant l'ID du document de preuve (\`settlementProofId\`).
- Le document doit avoir été uploadé au préalable via \`POST /documents/upload\` (type: SETTLEMENT_PROOF).
- Si la somme des engagements confirmés atteint \`amountRequested\`, la demande passe automatiquement en **FUNDED**.`,
  })
  @ApiParam({ name: 'id', description: 'UUID de l\'engagement' })
  @ApiResponse({ status: 200, description: 'Engagement confirmé. La demande peut passer en FUNDED si 100% atteint.' })
  @ApiResponse({ status: 403, description: 'Vous ne pouvez confirmer que vos propres engagements' })
  @ApiResponse({ status: 409, description: 'L\'engagement n\'est pas en statut COMMITTED' })
  @Patch(':id/settle')
  settle(@Param('id') id: string, @Body() dto: SettleInvestmentDto, @Request() req) {
    return this.investmentsService.settle(id, dto, req.user.id);
  }
}
