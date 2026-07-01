import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationsRepository } from './organizations.repository';
import { CreateOrganizationDto } from './dto/create-organization.dto';

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

  async getAllOrganizations(filters?: { status?: string; search?: string }) {
    return this.organizationsRepository.findAll(filters);
  }

  async updateVerificationStatus(id: string, status: 'VERIFIED' | 'REJECTED') {
    const organization = await this.organizationsRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organisation introuvable.');
    }
    return this.organizationsRepository.updateVerificationStatus(id, status);
  }
}
