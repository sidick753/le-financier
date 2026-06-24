import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SettleInvestmentDto {
  @ApiProperty({ example: 'uuid-du-document-preuve', description: "ID du document de preuve de paiement (type SETTLEMENT_PROOF, uploadé via POST /documents/upload)" })
  @IsUUID()
  settlementProofId: string;
}
