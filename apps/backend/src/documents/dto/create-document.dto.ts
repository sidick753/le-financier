import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum DocumentTypeDto {
  KYC_ID = 'KYC_ID',
  KYC_PROOF_OF_ADDRESS = 'KYC_PROOF_OF_ADDRESS',
  ORGANIZATION_LEGAL = 'ORGANIZATION_LEGAL',
  FINANCIAL_STATEMENT = 'FINANCIAL_STATEMENT',
  FUNDING_REQUEST_ATTACHMENT = 'FUNDING_REQUEST_ATTACHMENT',
  SETTLEMENT_PROOF = 'SETTLEMENT_PROOF',
  DISPUTE_EVIDENCE = 'DISPUTE_EVIDENCE',
  OTHER = 'OTHER',
}

export class CreateDocumentDto {
  @IsEnum(DocumentTypeDto)
  type: DocumentTypeDto;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  fundingRequestId?: string;
}
