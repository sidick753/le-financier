import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { FundingRepository } from './funding.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { CreateFundingRequestDto } from './dto/create-funding-request.dto';

@Injectable()
export class FundingService {
  constructor(
    private fundingRepository: FundingRepository,
    private organizationsRepository: OrganizationsRepository,
  ) {}

  async create(dto: CreateFundingRequestDto, userId: string) {
    const isMember = await this.organizationsRepository.isMember(
      dto.organizationId,
      userId,
    );
    if (!isMember) {
      throw new ForbiddenException(
        "Vous ne pouvez créer une demande que pour une organisation dont vous êtes membre.",
      );
    }

    return this.fundingRepository.create({
      organizationId: dto.organizationId,
      title: dto.title,
      description: dto.description,
      category: dto.category as any,
      amountRequested: dto.amountRequested,
      expectedReturn: dto.expectedReturn,
      durationMonths: dto.durationMonths,
    });
  }

  async findMineByOrganization(organizationId: string, userId: string) {
    const isMember = await this.organizationsRepository.isMember(organizationId, userId);
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès à cette organisation.");
    }

    return this.fundingRepository.findAllByOrganizationId(organizationId);
  }

  async findAllPublished() {
    return this.fundingRepository.findAllPublished();
  }

  async submitForReview(fundingRequestId: string, userId: string) {
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

    if (fundingRequest.status !== 'DRAFT') {
      throw new BadRequestException(
        'Seule une demande en brouillon peut être soumise pour révision.',
      );
    }

    return this.fundingRepository.updateStatus(fundingRequestId, 'UNDER_REVIEW');
  }

  async approve(fundingRequestId: string) {
    const fundingRequest = await this.fundingRepository.findById(fundingRequestId);
    if (!fundingRequest) {
      throw new NotFoundException('Demande de financement introuvable.');
    }

    if (fundingRequest.status !== 'UNDER_REVIEW') {
      throw new BadRequestException(
        'Seule une demande en révision peut être publiée.',
      );
    }

    return this.fundingRepository.updateStatus(fundingRequestId, 'PUBLISHED');
  }

  async reject(fundingRequestId: string) {
    const fundingRequest = await this.fundingRepository.findById(fundingRequestId);
    if (!fundingRequest) {
      throw new NotFoundException('Demande de financement introuvable.');
    }

    if (fundingRequest.status !== 'UNDER_REVIEW') {
      throw new BadRequestException(
        'Seule une demande en révision peut être rejetée.',
      );
    }

    return this.fundingRepository.updateStatus(fundingRequestId, 'REJECTED');
  }
}
