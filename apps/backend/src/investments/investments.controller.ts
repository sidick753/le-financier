import { Body, Controller, Get, Param, Post, Patch, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { InvestmentsService } from './investments.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { CounterOfferDto } from './dto/counter-offer.dto';
import { SettleInvestmentDto } from './dto/settle-investment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RejectionReasonDto } from '../common/dto/rejection-reason.dto';

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
    return this.investmentsService.counterOffer(id, dto.proposedReturn, req.user.id, req.user.role, dto.conditions, dto.note);
  }

  @ApiOperation({ summary: 'Accepter la dernière offre', description: 'Accepte la proposition en attente. Interdit d\'accepter sa propre proposition.' })
  @ApiParam({ name: 'id', description: 'UUID de l\'engagement' })
  @ApiResponse({ status: 200, description: 'Offre acceptée — engagement passe en COMMITTED' })
  @ApiResponse({ status: 409, description: 'Aucune offre à accepter ou acceptation de sa propre offre' })
  @Patch(':id/accept-offer')
  acceptOffer(@Param('id') id: string, @Request() req) {
    return this.investmentsService.acceptOffer(id, req.user.id, req.user.role);
  }

  @ApiOperation({
    summary: 'Refuser / abandonner la négociation',
    description: 'Met fin à la négociation en cours, quelle que soit la partie qui a la balle (pas de contrainte de tour, contrairement à accept/counter). L\'engagement passe en REJECTED et libère le montant restant sur la demande.',
  })
  @ApiParam({ name: 'id', description: 'UUID de l\'engagement' })
  @ApiResponse({ status: 200, description: 'Négociation close — statut REJECTED' })
  @ApiResponse({ status: 409, description: 'Cet engagement n\'est pas en négociation' })
  @Patch(':id/reject-offer')
  rejectOffer(@Param('id') id: string, @Request() req) {
    return this.investmentsService.rejectOffer(id, req.user.id, req.user.role);
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
    summary: 'Soumettre une preuve de virement (COMMITTED → SETTLEMENT_SUBMITTED)',
    description: `L'investisseur a viré les fonds sur le compte de la plateforme et soumet son justificatif en fournissant l'ID du document de preuve (\`settlementProofId\`).
- Le document doit avoir été uploadé au préalable via \`POST /documents/upload\` (type: SETTLEMENT_PROOF).
- L'engagement passe en **SETTLEMENT_SUBMITTED** et attend la validation d'un admin (\`PATCH :id/settlement/approve\` ou \`/reject\`).
- Tant que ce n'est pas validé, ni \`amountRaised\` ni le statut de la demande ne bougent.`,
  })
  @ApiParam({ name: 'id', description: 'UUID de l\'engagement' })
  @ApiResponse({ status: 200, description: 'Preuve soumise, en attente de validation admin.' })
  @ApiResponse({ status: 403, description: 'Vous ne pouvez confirmer que vos propres engagements' })
  @ApiResponse({ status: 409, description: 'L\'engagement n\'est pas en statut COMMITTED' })
  @Patch(':id/settle')
  settle(@Param('id') id: string, @Body() dto: SettleInvestmentDto, @Request() req) {
    return this.investmentsService.settle(id, dto, req.user.id);
  }

  @ApiOperation({ summary: '[ADMIN] Nombre de preuves de virement en attente de validation', description: 'Sert de badge sur le menu Opportunités et sur les lignes concernées.' })
  @ApiResponse({ status: 200, description: '{ count: number }' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/pending-settlements-count')
  async getPendingSettlementsCount() {
    const count = await this.investmentsService.getPendingSettlementsCount();
    return { count };
  }

  @ApiOperation({
    summary: '[ADMIN] Valider la preuve de virement (SETTLEMENT_SUBMITTED → SETTLED_OFF_PLATFORM)',
    description: `Valide le justificatif de virement soumis par l'investisseur.
- Génère l'échéancier de remboursement.
- Recalcule \`amountRaised\` de la demande à partir des seuls virements validés.
- Si 100% est atteint, la demande passe automatiquement en **FUNDED**. Le versement à la PME reste une action séparée : la PME réclame (\`POST /funding-requests/:id/claims\`), un admin valide (\`PATCH /funding-requests/claims/:claimId/approve\`) — réclamable dès qu'un investissement est validé, pas besoin d'attendre 100%.`,
  })
  @ApiParam({ name: 'id', description: 'UUID de l\'engagement' })
  @ApiResponse({ status: 200, description: 'Virement validé.' })
  @ApiResponse({ status: 409, description: 'Aucune preuve en attente de validation' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/settlement/approve')
  approveSettlement(@Param('id') id: string, @Request() req) {
    return this.investmentsService.approveSettlement(id, req.user.id);
  }

  @ApiOperation({
    summary: '[ADMIN] Rejeter la preuve de virement (SETTLEMENT_SUBMITTED → COMMITTED)',
    description: 'Rejette le justificatif soumis. L\'investisseur retombe en COMMITTED et doit soumettre une nouvelle preuve.',
  })
  @ApiParam({ name: 'id', description: 'UUID de l\'engagement' })
  @ApiResponse({ status: 200, description: 'Preuve rejetée.' })
  @ApiResponse({ status: 409, description: 'Aucune preuve en attente de validation' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/settlement/reject')
  rejectSettlement(@Param('id') id: string, @Body() dto: RejectionReasonDto, @Request() req) {
    return this.investmentsService.rejectSettlement(id, req.user.id, dto.reason);
  }
}
