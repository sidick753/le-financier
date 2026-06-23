import { IsUUID, IsNumber, Min } from 'class-validator';

export class CreateInvestmentDto {
  @IsUUID()
  fundingRequestId: string;

  @IsNumber()
  @Min(1)
  amountCommitted: number;
}
