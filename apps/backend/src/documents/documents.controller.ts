import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  ForbiddenException,
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

@ApiTags('Documents')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private documentsService: DocumentsService,
    private organizationsRepository: OrganizationsRepository,
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
    if (dto.organizationId) {
      const isMember = await this.organizationsRepository.isMember(
        dto.organizationId,
        req.user.id,
      );
      if (!isMember) {
        throw new ForbiddenException("Vous n'avez pas accès à cette organisation.");
      }
    }
    return this.documentsService.upload(file, dto, req.user.id);
  }

  @ApiOperation({ summary: 'URL de téléchargement', description: 'Retourne une URL pré-signée (valable 15 min) pour télécharger le document.' })
  @ApiParam({ name: 'id', description: 'UUID du document' })
  @ApiResponse({ status: 200, description: '{ url: string }' })
  @ApiResponse({ status: 403, description: 'Accès non autorisé' })
  @ApiResponse({ status: 404, description: 'Document introuvable' })
  @Get(':id/download-url')
  getDownloadUrl(@Param('id') id: string, @Request() req) {
    return this.documentsService.getDownloadUrl(id, req.user.id);
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

  @ApiOperation({ summary: 'Documents d\'une organisation', description: 'Retourne tous les documents associés à une organisation.' })
  @ApiParam({ name: 'organizationId', description: 'UUID de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Liste de documents' })
  @Get('organization/:organizationId')
  async findAllByOrganization(
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
    return this.documentsService.findAllByOrganizationId(organizationId);
  }
}
