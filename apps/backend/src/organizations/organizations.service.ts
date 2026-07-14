import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationsRepository } from './organizations.repository';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateCreditProfileDto } from './dto/update-credit-profile.dto';
import { UpdateBankInfoDto } from './dto/update-bank-info.dto';

@Injectable()
export class OrganizationsService {
  constructor(private organizationsRepository: OrganizationsRepository) {}

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
    return this.organizationsRepository.updateVerificationStatus(id, status, rejectionReason);
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

    return this.organizationsRepository.updateCreditProfile(id, dto);
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

    return this.organizationsRepository.updateBankInfo(id, dto);
  }
}
