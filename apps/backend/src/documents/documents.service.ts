import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DocumentsRepository } from './documents.repository';
import { StorageService } from './storage/storage.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { getKycRequirements } from './kyc-checklist';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

@Injectable()
export class DocumentsService {
  constructor(
    private documentsRepository: DocumentsRepository,
    private storageService: StorageService,
  ) {}

  async upload(file: Express.Multer.File, dto: CreateDocumentDto, uploadedById: string) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu.');
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('Le fichier dépasse la taille maximale de 10 Mo.');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Type de fichier non autorisé. Formats acceptés : PDF, JPEG, PNG, WEBP.',
      );
    }

    const storageKey = this.storageService.generateStorageKey(file.originalname, {
      type: dto.type,
      organizationId: dto.organizationId,
      fundingRequestId: dto.fundingRequestId,
    });

    await this.storageService.upload(storageKey, file.buffer, file.mimetype);

    try {
      return await this.documentsRepository.create({
        type: dto.type as any,
        storageKey,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedById,
        organizationId: dto.organizationId,
        fundingRequestId: dto.fundingRequestId,
        kycRequirementKey: dto.kycRequirementKey,
      });
    } catch (err) {
      // Rollback : supprime le fichier MinIO si l'écriture en base échoue
      await this.storageService.delete(storageKey).catch(() => {});
      throw err;
    }
  }

  async getDownloadUrl(documentId: string, requesterId: string) {
    const document = await this.documentsRepository.findById(documentId);
    if (!document) {
      throw new NotFoundException('Document introuvable.');
    }
    if (document.uploadedById !== requesterId) {
      throw new ForbiddenException('Accès non autorisé à ce document.');
    }
    const url = await this.storageService.getSignedDownloadUrl(document.storageKey);
    return { url, fileName: document.fileName };
  }

  async findAllByOrganizationId(organizationId: string) {
    return this.documentsRepository.findAllByOrganizationId(organizationId);
  }

  async findAllByFundingRequestId(fundingRequestId: string) {
    return this.documentsRepository.findAllByFundingRequestId(fundingRequestId);
  }

  async getKycStatus(organizationId: string) {
    const documents = await this.documentsRepository.findAllByOrganizationId(organizationId);
    const requirements = getKycRequirements();

    return requirements.map((req) => {
      const matchingDoc = documents.find((d) => d.kycRequirementKey === req.key);
      return {
        key: req.key,
        label: req.label,
        documentType: req.documentType,
        status: matchingDoc
          ? matchingDoc.status === 'APPROVED'
            ? 'VALIDATED'
            : 'PENDING_REVIEW'
          : 'MISSING',
        documentId: matchingDoc?.id ?? null,
      };
    });
  }
}
