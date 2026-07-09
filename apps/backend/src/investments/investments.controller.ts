import { Body, Controller, Get, Param, Post, Patch, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { InvestmentsService } from './investments.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { CounterOfferDto } from './dto/counter-offer.dto';
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
  @ApiResponse({ status: 201, description: 'Négociation créée en statut NEGOTIATING avec première NegotiationOffer' })
  @ApiResponse({ status: 409, description: 'Demande fermée ou montant dépassé' })
  @Post()
  create(@Body() dto: CreateInvestmentDto, @Request() req) {
    return this.investmentsService.createNegotiation(dto, req.user.id);
  }

  @ApiOperation({ summary: 'Contre-proposition de taux', description: 'Soumet une nouvelle proposition de taux. Interdit si c\'est votre tour d\'attendre.' })
  @ApiParam({ name: 'id', description: 'UUID de l\'engagement' })
  @ApiResponse({ status: 200, description: 'Contre-proposition enregistrée' })
  @ApiResponse({ status: 409, description: 'Pas en négociation ou contre-proposition consécutive interdite' })
  @Patch(':id/counter-offer')
  counterOffer(@Param('id') id: string, @Body() dto: CounterOfferDto, @Request() req) {
    return this.investmentsService.counterOffer(id, dto.proposedReturn, req.user.id, req.user.role);
  }

  @ApiOperation({ summary: 'Accepter la dernière offre', description: 'Accepte la proposition en attente. Interdit d\'accepter sa propre proposition.' })
  @ApiParam({ name: 'id', description: 'UUID de l\'engagement' })
  @ApiResponse({ status: 200, description: 'Offre acceptée — engagement passe en COMMITTED' })
  @ApiResponse({ status: 409, description: 'Aucune offre à accepter ou acceptation de sa propre offre' })
  @Patch(':id/accept-offer')
  acceptOffer(@Param('id') id: string, @Request() req) {
    return this.investmentsService.acceptOffer(id, req.user.id, req.user.role);
  }

  @ApiOperation({ summary: 'Mon engagement sur une demande', description: 'Retourne l\'engagement de l\'investisseur courant sur une demande donnée, avec l\'historique des offres de négociation.' })
  @ApiParam({ name: 'fundingRequestId', description: 'UUID de la demande de financement' })
  @ApiResponse({ status: 200, description: 'Engagement avec negotiationOffers, ou null' })
  @Get('my-engagement/:fundingRequestId')
  findMyEngagement(@Param('fundingRequestId') fundingRequestId: string, @Request() req) {
    return this.investmentsService.findMyEngagement(fundingRequestId, req.user.id);
  }

  @ApiOperation({ summary: 'Mes engagements', description: 'Retourne tous les engagements de l\'investisseur courant.' })
  @ApiResponse({ status: 200, description: 'Liste d\'engagements' })
  @Get('mine')
  findMine(@Request() req) {
    return this.investmentsService.findMine(req.user.id);
  }

  @ApiOperation({ summary: 'Nombre de négociations en attente de ma réponse' })
  @ApiResponse({ status: 200, description: '{ count: number }' })
  @Get('mine/pending-count')
  async getMyPendingCount(@Request() req) {
    const count = await this.investmentsService.getMyPendingCount(req.user.id);
    return { count };
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

  @ApiOperation({ summary: 'Nombre d\'offres reçues en attente de réponse de la PME' })
  @ApiParam({ name: 'organizationId', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: '{ count: number }' })
  @Get('organization/:organizationId/pending-count')
  async getPendingCountForOrganization(@Param('organizationId') organizationId: string, @Request() req) {
    const count = await this.investmentsService.getPendingCountForOrganization(organizationId, req.user.id);
    return { count };
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
