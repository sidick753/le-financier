import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationsRepository } from './organizations.repository';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateCreditProfileDto } from './dto/update-credit-profile.dto';
import { UpdateBankInfoDto } from './dto/update-bank-info.dto';
import { UpdateIdentityDto } from './dto/update-identity.dto';
import { UpdateComplianceDto } from './dto/update-compliance.dto';
import { ScoringService } from '../scoring/scoring.service';
import { NotificationsService } from '../notifications/notifications.service';

const FRONTEND_URL = process.env.FRONTEND_URL ?? '';

@Injectable()
export class OrganizationsService {
  constructor(
    private organizationsRepository: OrganizationsRepository,
    private scoringService: ScoringService,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateOrganizationDto, ownerId: string) {
    const existing = await this.organizationsRepository.findByRegistrationNumber(
      dto.registrationNumber,
    );
    if (existing) {
      throw new ConflictException('Une organisation existe déjà avec ce numéro RCCM.');
    }

    return this.organizationsRepository.createWithOwner(
      { ...dto, country: 'CI' },
      ownerId,
    );
  }

  async findMine(userId: string) {
    return this.organizationsRepository.findAllByUserId(userId);
  }

  async findOneOrThrow(id: string, userId: string) {
    const organization = await this.organizationsRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organisation introuvable.');
    }

    const isMember = await this.organizationsRepository.isMember(id, userId);
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès à cette organisation.");
    }

    return organization;
  }

  async getAdminStats() {
    return this.organizationsRepository.countByStatus();
  }

  async getAllOrganizations(filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return this.organizationsRepository.findAll(filters);
  }

  async findOneAdmin(id: string) {
    const organization = await this.organizationsRepository.findByIdAdmin(id);
    if (!organization) {
      throw new NotFoundException('Organisation introuvable.');
    }
    return organization;
  }

  async updateVerificationStatus(
    id: string,
    status: 'VERIFIED' | 'REJECTED',
    rejectionReason?: string,
  ) {
    const organization = await this.organizationsRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organisation introuvable.');
    }
    const updated = await this.organizationsRepository.updateVerificationStatus(id, status, rejectionReason);

    const owner = await this.organizationsRepository.findOwnerMember(id);
    if (owner) {
      await this.notificationsService.notify(
        owner.userId,
        status === 'VERIFIED' ? 'Organisation vérifiée' : 'Vérification rejetée',
        status === 'VERIFIED'
          ? `${organization.legalName} a été vérifiée avec succès.`
          : `La vérification de ${organization.legalName} a été rejetée : ${rejectionReason ?? 'raison non précisée'}`,
        `${FRONTEND_URL}/dashboard/parametres`,
        { email: true, ctaLabel: 'Voir mon organisation' },
      );
    }

    return updated;
  }

  async updateCompliance(id: string, dto: UpdateComplianceDto) {
    const organization = await this.organizationsRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organisation introuvable.');
    }
    return this.organizationsRepository.updateCompliance(id, dto.dirigeantEstPep);
  }

  async updateCreditProfile(id: string, userId: string, dto: UpdateCreditProfileDto) {
    const organization = await this.organizationsRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organisation introuvable.');
    }

    const isMember = await this.organizationsRepository.isMember(id, userId);
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès à cette organisation.");
    }

    const updated = await this.organizationsRepository.updateCreditProfile(id, dto);

    // Recalcul immédiat (attendu, pas fire-and-forget) pour que la PME voie son score
    // à jour dès la sauvegarde — une erreur de scoring ne doit pas faire échouer la
    // sauvegarde du profil, donc on logue sans relancer.
    try {
      await this.scoringService.computeOrganizationScore(id);
    } catch (err) {
      console.error(`[ScoringService] Erreur calcul du score PME ${id}:`, err);
    }

    return updated;
  }

  async updateBankInfo(id: string, userId: string, dto: UpdateBankInfoDto) {
    const organization = await this.organizationsRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organisation introuvable.');
    }

    const isMember = await this.organizationsRepository.isMember(id, userId);
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès à cette organisation.");
    }

    const updated = await this.organizationsRepository.updateBankInfo(id, dto);

    // Coordonnées bancaires = la destination du décaissement final vers la PME —
    // exactement la donnée surveillée par le moteur AML (bénéficiaire non identifié).
    // Un changement non tracé est un vecteur de fraude classique (détournement du
    // virement) : l'admin doit pouvoir le rapprocher d'une demande légitime.
    await this.notificationsService.notifyAdmins(
      'Coordonnées bancaires modifiées',
      `${organization.legalName} a modifié ses coordonnées bancaires de réception des fonds.`,
      `${FRONTEND_URL}/admin/pme/${id}`,
      { email: true, ctaLabel: "Vérifier l'organisation" },
    );

    return updated;
  }

  async updateIdentity(id: string, userId: string, dto: UpdateIdentityDto) {
    const organization = await this.organizationsRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organisation introuvable.');
    }

    const isMember = await this.organizationsRepository.isMember(id, userId);
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès à cette organisation.");
    }

    return this.organizationsRepository.updateIdentity(id, dto);
  }
}
