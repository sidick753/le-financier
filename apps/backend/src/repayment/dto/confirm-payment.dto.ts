import { IsOptional, IsUUID, IsNumber, Min } from 'class-validator';

export class ConfirmPaymentDto {
  @IsOptional()
  @IsUUID()
  proofDocumentId?: string;

  // Montant de cette tranche. Si omis, couvre le solde restant dû sur l'échéance
  // (comportement historique : un seul versement plein).
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}
