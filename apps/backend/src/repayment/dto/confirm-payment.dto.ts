import { IsOptional, IsUUID } from 'class-validator';

export class ConfirmPaymentDto {
  @IsOptional()
  @IsUUID()
  proofDocumentId?: string;
}
