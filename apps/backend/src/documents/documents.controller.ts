import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { FundingRepository } from '../funding/funding.repository';

@ApiTags('Documents')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private documentsService: DocumentsService,
    private organizationsRepository: OrganizationsRepository,
    private fundingRepository: FundingRepository,
  ) {}

  @ApiOperation({
    summary: 'Uploader un document',
    description: `Upload un fichier (PDF, image) et l'associe à une organisation ou une demande de financement.

**Types disponibles :**
| Type | Usage |
|------|-------|
| KYC_ID | Pièce d'identité |
| KYC_PROOF_OF_ADDRESS | Justificatif de domicile |
| ORGANIZATION_LEGAL | Document légal (RCCM, statuts) |
| FINANCIAL_STATEMENT | États financiers |
| FUNDING_REQUEST_ATTACHMENT | Pièce jointe à une demande |
| SETTLEMENT_PROOF | Preuve de paiement (utilisée dans PATCH /investments/:id/settle) |

Le fichier est stocké dans l'object storage (S3/MinIO).`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Fichier + métadonnées',
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file:                { type: 'string', format: 'binary' },
        type:                { type: 'string', enum: ['KYC_ID','KYC_PROOF_OF_ADDRESS','ORGANIZATION_LEGAL','FINANCIAL_STATEMENT','FUNDING_REQUEST_ATTACHMENT','SETTLEMENT_PROOF','OTHER'] },
        organizationId:      { type: 'string', format: 'uuid' },
        fundingRequestId:    { type: 'string', format: 'uuid' },
        kycRequirementKey:   { type: 'string', example: 'kyc_id' },
        title:               { type: 'string', example: 'Bilan comptable 2025', description: 'Requis pour le type OTHER' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploadé — retourne { id, storageKey, fileName, type }' })
  @ApiResponse({ status: 403, description: 'Pas membre de l\'organisation' })
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
    @Request() req,
  ) {
    // L'organisation propriétaire est toujours dérivée de la demande de
    // financement quand `fundingRequestId` est fourni — jamais du champ
    // `organizationId` envoyé par le client, qui pourrait ne pas correspondre
    // (ou être omis pour contourner le contrôle d'accès).
    let organizationId = dto.organizationId;

    if (dto.fundingRequestId) {
      const fundingRequest = await this.fundingRepository.findById(dto.fundingRequestId);
      if (!fundingRequest) {
        throw new NotFoundException('Demande de financement introuvable.');
      }
      organizationId = fundingRequest.organizationId;
    }

    if (!organizationId) {
      throw new BadRequestException(
        "organizationId ou fundingRequestId est requis pour associer ce document.",
      );
    }

    const isMember = await this.organizationsRepository.isMember(
      organizationId,
      req.user.id,
    );
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès à cette organisation.");
    }

    return this.documentsService.upload(file, { ...dto, organizationId }, req.user.id);
  }

  @ApiOperation({
    summary: 'URL de téléchargement',
    description: "Retourne une URL pré-signée (valable 15 min) pour télécharger le document. Accessible au déposant, à l'admin, à tout membre de l'organisation propriétaire, et — pour les types de document non-KYC (RCCM, états financiers, pièces jointes) — à tout utilisateur authentifié dès que la demande de financement liée est publique (PUBLISHED/FUNDED/CLOSED).",
  })
  @ApiParam({ name: 'id', description: 'UUID du document' })
  @ApiResponse({ status: 200, description: '{ url: string }' })
  @ApiResponse({ status: 403, description: 'Accès non autorisé' })
  @ApiResponse({ status: 404, description: 'Document introuvable' })
  @Get(':id/download-url')
  getDownloadUrl(@Param('id') id: string, @Request() req) {
    return this.documentsService.getDownloadUrl(id, req.user.id, req.user.role);
  }

  @ApiOperation({ summary: 'Statut KYC d\'une organisation', description: 'Retourne la checklist KYC de l\'organisation avec le statut de chaque document requis.' })
  @ApiParam({ name: 'organizationId', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: '{ completed: boolean, items: { key, label, status }[] }' })
  @Get('organization/:organizationId/kyc-status')
  async getKycStatus(
    @Param('organizationId') organizationId: string,
    @Request() req,
  ) {
    const isMember = await this.organizationsRepository.isMember(
      organizationId,
      req.user.id,
    );
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès à cette organisation.");
    }
    return this.documentsService.getKycStatus(organizationId);
  }

  @ApiOperation({
    summary: 'Documents d\'une organisation',
    description: "Membre de l'organisation : liste complète (y compris KYC). Autre utilisateur authentifié : sous-ensemble \"métier\" (RCCM, états financiers — pas KYC) si l'organisation a au moins une demande de financement publique (PUBLISHED/FUNDED/CLOSED), sinon 403.",
  })
  @ApiParam({ name: 'organizationId', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Liste de documents' })
  @ApiResponse({ status: 403, description: 'Organisation sans demande publique et non membre' })
  @Get('organization/:organizationId')
  findAllByOrganization(
    @Param('organizationId') organizationId: string,
    @Request() req,
  ) {
    return this.documentsService.findAllByOrganizationForUser(organizationId, req.user.id);
  }

  @ApiOperation({
    summary: 'Documents d\'une demande de financement',
    description: "Membre de l'organisation propriétaire : liste complète (y compris KYC). Autre utilisateur authentifié : sous-ensemble \"métier\" (RCCM, états financiers, pièces jointes — pas KYC) si la demande est publique (PUBLISHED/FUNDED/CLOSED), sinon 403.",
  })
  @ApiParam({ name: 'fundingRequestId', description: 'UUID de la demande de financement' })
  @ApiResponse({ status: 200, description: 'Liste de documents' })
  @ApiResponse({ status: 403, description: 'Demande non publique et non membre de l\'organisation propriétaire' })
  @ApiResponse({ status: 404, description: 'Demande introuvable' })
  @Get('funding-request/:fundingRequestId')
  findAllByFundingRequest(
    @Param('fundingRequestId') fundingRequestId: string,
    @Request() req,
  ) {
    return this.documentsService.findAllByFundingRequestForUser(fundingRequestId, req.user.id);
  }

  @ApiOperation({
    summary: 'Supprimer un document',
    description: "Supprime définitivement un document (fichier + métadonnées). Si le document est attaché à une demande de financement, celle-ci doit être encore au statut DRAFT ou UNDER_REVIEW.",
  })
  @ApiParam({ name: 'id', description: 'UUID du document' })
  @ApiResponse({ status: 200, description: 'Document supprimé' })
  @ApiResponse({ status: 400, description: 'Demande déjà publiée — document non supprimable' })
  @ApiResponse({ status: 403, description: 'Accès non autorisé à ce document' })
  @ApiResponse({ status: 404, description: 'Document introuvable' })
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.documentsService.remove(id, req.user.id, req.user.role);
  }
}
