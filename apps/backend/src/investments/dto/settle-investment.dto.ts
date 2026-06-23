import { IsUUID } from 'class-validator';

export class SettleInvestmentDto {
  @IsUUID()
  settlementProofId: string;
}
