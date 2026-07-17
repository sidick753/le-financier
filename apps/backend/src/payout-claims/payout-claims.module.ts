import { Module } from '@nestjs/common';
import { PayoutClaimsRepository } from './payout-claims.repository';

@Module({
  providers: [PayoutClaimsRepository],
  exports: [PayoutClaimsRepository],
})
export class PayoutClaimsModule {}
