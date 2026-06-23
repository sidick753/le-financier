import { Organization } from '@le-financier/database';

export interface CreateOrganizationData {
  legalName: string;
  registrationNumber: string;
  sector: string;
  foundedYear?: number;
  legalForm?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface IOrganizationsRepository {
  findById(id: string): Promise<Organization | null>;
  findByRegistrationNumber(registrationNumber: string): Promise<Organization | null>;
  findAllByUserId(userId: string): Promise<Organization[]>;
  createWithOwner(data: CreateOrganizationData, ownerId: string): Promise<Organization>;
  isMember(organizationId: string, userId: string): Promise<boolean>;
}
