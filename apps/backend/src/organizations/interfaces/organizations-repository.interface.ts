import { Organization, User } from '@le-financier/database';
import { CreateUserData } from '../../users/interfaces/users-repository.interface';

export interface CreateOrganizationData {
  legalName: string;
  registrationNumber: string;
  sector: string;
  foundedYear?: number;
  legalForm?: string;
  address?: string;
  city?: string;
  country?: string;
  secteurCode?: string;
}

export interface CreditProfileData {
  secteurCode?: string;
  secteurSaisonnalite?: boolean;
  secteurImportDevises?: boolean;
  secteurSoutienPublic?: boolean;
  cashFlowAnnuel?: number;
  fluxMobileMoneyMensuel?: number;
  autonomieFinanciere?: number;
  tauxEndettement?: number;
  ratioLiquidite?: number;
  tcamCa3ans?: number;
  margeBrute?: number;
  runwayMois?: number;
  nbClientsActifs?: number;
  dirigeantExperienceAns?: number;
  dirigeantAntecedents?: string;
  dirigeantIncidentsLegaux?: string;
  experienceSecteurAns?: number;
  trackRecord?: string;
  completudeEquipe?: string;
  droitsInvestisseur?: string;
  transparence?: string;
  tailleMarche?: string;
  scalabilite?: string;
  moat?: string;
  partMarcheRelative?: string;
}

export interface BankInfoData {
  bankName?: string;
  bankAccountHolder?: string;
  bankAccountNumber?: string;
  bankSwiftCode?: string;
}

export interface IdentityData {
  sector?: string;
  legalForm?: string;
  foundedYear?: number;
  address?: string;
  city?: string;
}

export interface IOrganizationsRepository {
  findById(id: string): Promise<Organization | null>;
  findByIdAdmin(id: string): Promise<Organization | null>;
  findByRegistrationNumber(registrationNumber: string): Promise<Organization | null>;
  findAllByUserId(userId: string): Promise<Organization[]>;
  findAll(filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Organization[]; total: number }>;
  createWithOwner(data: CreateOrganizationData, ownerId: string): Promise<Organization>;
  registerOwner(
    userData: Omit<CreateUserData, 'role'>,
    orgData: CreateOrganizationData,
  ): Promise<{ user: User; organization: Organization }>;
  isMember(organizationId: string, userId: string): Promise<boolean>;
  findOwnerMember(organizationId: string): Promise<{ userId: string } | null>;
  countByStatus(): Promise<{
    total: number;
    verified: number;
    pending: number;
    rejected: number;
    totalFinanced: number;
  }>;
  updateVerificationStatus(
    id: string,
    status: 'VERIFIED' | 'REJECTED',
    rejectionReason?: string,
  ): Promise<Organization>;
  updateCreditProfile(id: string, data: CreditProfileData): Promise<Organization>;
  updateBankInfo(id: string, data: BankInfoData): Promise<Organization>;
  updateIdentity(id: string, data: IdentityData): Promise<Organization>;
  updateCompliance(id: string, dirigeantEstPep: boolean): Promise<Organization>;
}
