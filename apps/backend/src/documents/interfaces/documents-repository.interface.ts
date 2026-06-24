import { Document } from '@le-financier/database';

export interface CreateDocumentData {
  type: Document['type'];
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  organizationId?: string;
  fundingRequestId?: string;
  kycRequirementKey?: string;
}

export interface IDocumentsRepository {
  create(data: CreateDocumentData): Promise<Document>;
  findById(id: string): Promise<Document | null>;
  findAllByOrganizationId(organizationId: string): Promise<Document[]>;
  findAllByFundingRequestId(fundingRequestId: string): Promise<Document[]>;
  updateStatus(id: string, status: Document['status']): Promise<Document>;
}
