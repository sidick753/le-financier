import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DocumentsRepository } from './documents.repository';
import { StorageService } from './storage/storage.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { getKycRequirements } from './kyc-checklist';
import { FundingRepository } from '../funding/funding.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { EDITABLE_FUNDING_STATUSES } from '../funding/funding-status.constants';

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
    private fundingRepository: FundingRepository,
    private organizationsRepository: OrganizationsRepository,
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
    if (dto.type === 'OTHER' && !dto.title?.trim()) {
      throw new BadRequestException('Un titre est requis pour ce document.');
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
        title: dto.title?.trim() || undefined,
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

  async getDownloadUrl(documentId: string, requesterId: string, requesterRole?: string) {
    const document = await this.documentsRepository.findById(documentId);
    if (!document) {
      throw new NotFoundException('Document introuvable.');
    }
    const isAdmin = requesterRole === 'ADMIN' || requesterRole === 'SUPER_ADMIN';
    if (document.uploadedById !== requesterId && !isAdmin) {
      throw new ForbiddenException('Accès non autorisé à ce document.');
    }
    const url = await this.storageService.getSignedDownloadUrl(document.storageKey);
    return { url, fileName: document.fileName, mimeType: document.mimeType };
  }

  async findAllByOrganizationId(organizationId: string) {
    return this.documentsRepository.findAllByOrganizationId(organizationId);
  }

  async findAllByFundingRequestId(fundingRequestId: string) {
    return this.documentsRepository.findAllByFundingRequestId(fundingRequestId);
  }

  async findAllByFundingRequestForUser(fundingRequestId: string, userId: string) {
    const fundingRequest = await this.fundingRepository.findById(fundingRequestId);
    if (!fundingRequest) {
      throw new NotFoundException('Demande de financement introuvable.');
    }
    const isMember = await this.organizationsRepository.isMember(
      fundingRequest.organizationId,
      userId,
    );
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès à cette demande.");
    }
    return this.documentsRepository.findAllByFundingRequestId(fundingRequestId);
  }

  async remove(documentId: string, userId: string, requesterRole?: string) {
    const document = await this.documentsRepository.findById(documentId);
    if (!document) {
      throw new NotFoundException('Document introuvable.');
    }

    const isAdmin = requesterRole === 'ADMIN' || requesterRole === 'SUPER_ADMIN';

    if (!isAdmin) {
      if (document.organizationId) {
        const isMember = await this.organizationsRepository.isMember(
          document.organizationId,
          userId,
        );
        if (!isMember) {
          throw new ForbiddenException("Vous n'avez pas accès à ce document.");
        }
      } else if (document.uploadedById !== userId) {
        throw new ForbiddenException("Vous n'avez pas accès à ce document.");
      }

      // Un document déjà validé (ex. pièce KYC approuvée) ne doit pas pouvoir
      // être retiré unilatéralement par un membre de l'organisation — seul un
      // admin peut revenir dessus.
      if (document.status === 'APPROVED') {
        throw new BadRequestException(
          'Un document déjà validé ne peut plus être supprimé.',
        );
      }

      if (document.fundingRequestId) {
        const fundingRequest = await this.fundingRepository.findById(document.fundingRequestId);
        if (fundingRequest && !EDITABLE_FUNDING_STATUSES.includes(fundingRequest.status)) {
          throw new BadRequestException(
            "Les documents d'une demande déjà publiée ne peuvent plus être supprimés.",
          );
        }
      }
    }

    await this.storageService.delete(document.storageKey).catch(() => {});
    await this.documentsRepository.delete(documentId);
    return { success: true };
  }

  // Appelé par FundingService.remove() avant de supprimer une demande : les
  // lignes Document sont retirées en cascade par Postgres, mais les fichiers
  // physiques doivent être nettoyés explicitement pour ne pas fuiter dans
  // l'object storage.
  async deleteStorageForFundingRequest(fundingRequestId: string) {
    const documents = await this.documentsRepository.findAllByFundingRequestId(fundingRequestId);
    await Promise.all(
      documents.map((doc) => this.storageService.delete(doc.storageKey).catch(() => {})),
    );
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
