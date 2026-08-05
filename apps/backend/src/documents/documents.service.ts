import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DocumentsRepository } from './documents.repository';
import { StorageService } from './storage/storage.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { getKycRequirements } from './kyc-checklist';
import { FundingRepository } from '../funding/funding.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { EDITABLE_FUNDING_STATUSES, PUBLIC_FUNDING_STATUSES } from '../funding/funding-status.constants';
import { INVESTOR_VISIBLE_DOCUMENT_TYPES } from './document-visibility.constants';
import { NotificationsService } from '../notifications/notifications.service';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const FRONTEND_URL = process.env.FRONTEND_URL ?? '';

// Types de document soumis à une revue KYC admin — les autres (preuve de virement,
// pièce de litige, pièce jointe libre...) ont leur propre flux de notification
// dédié ailleurs (ex. InvestmentsService.settle) ou ne sont pas bloquants.
const KYC_REVIEW_DOCUMENT_TYPES = ['KYC_ID', 'KYC_PROOF_OF_ADDRESS', 'ORGANIZATION_LEGAL', 'FINANCIAL_STATEMENT'];

// Un investisseur ne doit jamais voir un document soumis à revue KYC (RCCM, bilan...)
// tant qu'un admin ne l'a pas validé — encore moins un document déjà rejeté (potentiellement
// frauduleux). Les types hors revue KYC (pièce jointe libre, "autre") restent visibles dès
// le dépôt : personne ne les fait jamais passer par /documents/admin/:id/approve.
function isInvestorVisibleDocument(doc: { type: string; status: string }): boolean {
  if (!INVESTOR_VISIBLE_DOCUMENT_TYPES.includes(doc.type)) return false;
  if (KYC_REVIEW_DOCUMENT_TYPES.includes(doc.type)) return doc.status === 'APPROVED';
  return true;
}

@Injectable()
export class DocumentsService {
  constructor(
    private documentsRepository: DocumentsRepository,
    private storageService: StorageService,
    private fundingRepository: FundingRepository,
    private organizationsRepository: OrganizationsRepository,
    private notificationsService: NotificationsService,
  ) {}

  async upload(file: Express.Multer.File, dto: CreateDocumentDto, uploadedById: string) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu.');
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('Le fichier dépasse la taille maximale de 50 Mo.');
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

    let document;
    try {
      document = await this.documentsRepository.create({
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

    // Un document KYC déposé (ou redéposé après rejet) attend une revue admin —
    // jusqu'ici l'admin ne le découvrait qu'en allant vérifier manuellement la
    // checklist d'une PME/d'un investisseur au hasard.
    if (KYC_REVIEW_DOCUMENT_TYPES.includes(dto.type)) {
      const link = dto.organizationId
        ? `${FRONTEND_URL}/admin/pme/${dto.organizationId}`
        : `${FRONTEND_URL}/admin/investisseurs/${uploadedById}`;
      await this.notificationsService.notifyAdmins(
        'Document à valider',
        `Un document "${document.title ?? document.fileName}" a été déposé et attend une revue KYC.`,
        link,
        { email: true, ctaLabel: 'Examiner le document' },
      );
    }

    return document;
  }

  async getDownloadUrl(documentId: string, requesterId: string, requesterRole?: string) {
    const document = await this.documentsRepository.findById(documentId);
    if (!document) {
      throw new NotFoundException('Document introuvable.');
    }
    const isAdmin = requesterRole === 'ADMIN' || requesterRole === 'SUPER_ADMIN';
    if (!isAdmin && document.uploadedById !== requesterId) {
      // Pas le déposant lui-même : autorisé seulement s'il est membre de
      // l'organisation propriétaire du document (ex. un cofondateur qui
      // consulte un document déposé par un autre membre de la même PME).
      const isOrgMember = document.organizationId
        ? await this.organizationsRepository.isMember(document.organizationId, requesterId)
        : false;
      if (!isOrgMember) {
        // Ni membre ni admin : autorisé uniquement pour un type de document
        // "métier" (pas KYC) rattaché — directement ou via l'organisation —
        // à une demande de financement déjà rendue publique. Même règle que
        // findAllByFundingRequestForUser/findAllByOrganizationForUser, pour
        // qu'un investisseur ne puisse pas contourner le filtre de liste en
        // devinant l'id d'un document KYC.
        const isInvestorVisible =
          isInvestorVisibleDocument(document) &&
          (document.fundingRequestId
            ? await this.isFundingRequestPublic(document.fundingRequestId)
            : document.organizationId
              ? await this.hasPublicFundingRequest(document.organizationId)
              : false);
        if (!isInvestorVisible) {
          throw new ForbiddenException('Accès non autorisé à ce document.');
        }
      }
    }
    const url = await this.storageService.getSignedDownloadUrl(document.storageKey);
    return { url, fileName: document.fileName, mimeType: document.mimeType };
  }

  async findAllByOrganizationId(organizationId: string) {
    return this.documentsRepository.findAllByOrganizationId(organizationId);
  }

  // Utilisé par l'autorisation d'upload d'une preuve de virement (SETTLEMENT_PROOF) :
  // l'investisseur n'est jamais membre de l'organisation PME, seul un engagement
  // sur cette demande (le sien ou celui d'un collègue de la même institution) l'autorise.
  async hasInvestmentEngagement(fundingRequestId: string, investorIds: string[]) {
    return this.documentsRepository.hasInvestmentEngagement(fundingRequestId, investorIds);
  }

  async findPersonalDocuments(userId: string) {
    return this.documentsRepository.findPersonalDocuments(userId);
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
    const documents = await this.documentsRepository.findAllByFundingRequestId(fundingRequestId);
    if (isMember) {
      // Sens inverse : la preuve de virement d'un investisseur (SETTLEMENT_PROOF) ne
      // concerne jamais la PME — seul un admin la vérifie (voir InvestmentsService.
      // settle/approveSettlement). La lui montrer exposerait en plus les coordonnées
      // bancaires de l'investisseur sans raison, validée ou non.
      return documents.filter((doc) => doc.type !== 'SETTLEMENT_PROOF');
    }
    // Non-membre (investisseur, institution...) : accès en lecture seule aux
    // documents "métier" (pas KYC) une fois la demande rendue publique — pour
    // évaluer le dossier avant d'engager des fonds. Une demande encore en
    // DRAFT/UNDER_REVIEW reste entièrement privée.
    if (!PUBLIC_FUNDING_STATUSES.includes(fundingRequest.status)) {
      throw new ForbiddenException("Vous n'avez pas accès à cette demande.");
    }
    return documents.filter(isInvestorVisibleDocument);
  }

  // Le RCCM, les bilans, etc. sont versés une fois au niveau de l'organisation
  // (checklist KYC, cf. kyc-checklist.ts) plutôt que ressaisis à chaque demande
  // de financement — c'est ici, et non dans findAllByFundingRequestForUser, que
  // vit la majorité des documents "métier" qu'un investisseur veut consulter.
  async findAllByOrganizationForUser(organizationId: string, userId: string) {
    const isMember = await this.organizationsRepository.isMember(organizationId, userId);
    const documents = await this.documentsRepository.findAllByOrganizationId(organizationId);
    if (isMember) {
      return documents;
    }
    if (!(await this.hasPublicFundingRequest(organizationId))) {
      throw new ForbiddenException("Vous n'avez pas accès à cette organisation.");
    }
    return documents.filter(isInvestorVisibleDocument);
  }

  private async isFundingRequestPublic(fundingRequestId: string): Promise<boolean> {
    const fundingRequest = await this.fundingRepository.findById(fundingRequestId);
    return !!fundingRequest && PUBLIC_FUNDING_STATUSES.includes(fundingRequest.status);
  }

  // Une organisation n'a pas de statut public propre : elle est "publique" au
  // sens documentaire dès lors qu'au moins une de ses demandes de financement
  // l'est — évite qu'un investisseur puisse lister les documents d'une PME qui
  // n'a encore jamais rien publié.
  private async hasPublicFundingRequest(organizationId: string): Promise<boolean> {
    const fundingRequests = await this.fundingRepository.findAllByOrganizationId(organizationId);
    return fundingRequests.some((fr) => PUBLIC_FUNDING_STATUSES.includes(fr.status));
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

  // [ADMIN] Valide un document déposé : passe en APPROVED, ce qui le protège
  // ensuite d'une suppression par un membre de l'organisation (voir remove()).
  async approve(documentId: string) {
    const document = await this.documentsRepository.findById(documentId);
    if (!document) {
      throw new NotFoundException('Document introuvable.');
    }
    if (document.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Ce document a déjà été traité.');
    }

    const approved = await this.documentsRepository.updateStatus(documentId, 'APPROVED');

    // Lien valable seulement côté PME (page /dashboard/documents scoped organisation) —
    // un document personnel (KYC investisseur/institution sans organizationId) n'a pas
    // encore d'équivalent frontend, on omet alors le lien plutôt que d'en deviner un faux.
    const link = document.organizationId ? `${FRONTEND_URL}/dashboard/documents` : undefined;
    // Rattaché à une organisation (RCCM, bilan...) : toute l'équipe PME doit savoir,
    // pas seulement le membre qui a déposé le document. Document personnel (KYC
    // investisseur/institution) : uploadedById reste le seul destinataire pertinent.
    const recipientIds = document.organizationId
      ? await this.organizationsRepository.findAllMemberUserIds(document.organizationId)
      : [document.uploadedById];
    await this.notificationsService.notifyMany(
      recipientIds,
      'Document validé',
      `Votre document "${document.title ?? document.fileName}" a été validé.`,
      link,
      { email: true, ctaLabel: 'Voir mes documents' },
    );

    return approved;
  }

  // [ADMIN] Rejette un document : le déposant doit en soumettre un nouveau.
  async reject(documentId: string, reason: string) {
    const document = await this.documentsRepository.findById(documentId);
    if (!document) {
      throw new NotFoundException('Document introuvable.');
    }
    if (document.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Ce document a déjà été traité.');
    }

    const rejected = await this.documentsRepository.updateStatus(documentId, 'REJECTED', reason);

    const link = document.organizationId ? `${FRONTEND_URL}/dashboard/documents` : undefined;
    const recipientIds = document.organizationId
      ? await this.organizationsRepository.findAllMemberUserIds(document.organizationId)
      : [document.uploadedById];
    await this.notificationsService.notifyMany(
      recipientIds,
      'Document rejeté',
      `Votre document "${document.title ?? document.fileName}" a été rejeté : ${reason}. Merci de le resoumettre.`,
      link,
      { email: true, ctaLabel: 'Resoumettre mon document' },
    );

    return rejected;
  }

  async getKycStatus(organizationId: string) {
    const documents = await this.documentsRepository.findAllByOrganizationId(organizationId);
    const requirements = getKycRequirements();

    return requirements.map((req) => {
      const matchingDoc = documents.find((d) => d.kycRequirementKey === req.key);
      const status = !matchingDoc
        ? 'MISSING'
        : matchingDoc.status === 'APPROVED'
          ? 'VALIDATED'
          : matchingDoc.status === 'REJECTED'
            ? 'REJECTED'
            : 'PENDING_REVIEW';
      return {
        key: req.key,
        label: req.label,
        documentType: req.documentType,
        status,
        documentId: matchingDoc?.id ?? null,
        rejectionReason: status === 'REJECTED' ? matchingDoc!.rejectionReason : null,
      };
    });
  }
}
