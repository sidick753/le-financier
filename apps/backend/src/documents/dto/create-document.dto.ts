import { IsEnum, IsOptional, IsUUID, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
  @ApiProperty({
    enum: DocumentTypeDto,
    example: DocumentTypeDto.FUNDING_REQUEST_ATTACHMENT,
    description: 'Type de document',
  })
  @IsEnum(DocumentTypeDto)
  type: DocumentTypeDto;

  @ApiProperty({ example: 'uuid-organisation', required: false, description: 'ID organisation (requis pour KYC_* et ORGANIZATION_LEGAL)' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ example: 'uuid-demande', required: false, description: 'ID demande de financement (requis pour FUNDING_REQUEST_ATTACHMENT)' })
  @IsOptional()
  @IsUUID()
  fundingRequestId?: string;

  @ApiProperty({ example: 'kyc_id', required: false, description: 'Clé de pré-requis KYC (kyc_id | kyc_address | org_legal | financial_statement)' })
  @IsOptional()
  @IsString()
  kycRequirementKey?: string;
}
