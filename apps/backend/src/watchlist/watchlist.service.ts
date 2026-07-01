import { Injectable } from '@nestjs/common';
import { WatchlistRepository } from './watchlist.repository';

@Injectable()
export class WatchlistService {
  constructor(private repo: WatchlistRepository) {}

  add(investorId: string, fundingRequestId: string) {
    return this.repo.add(investorId, fundingRequestId);
  }

  remove(investorId: string, fundingRequestId: string) {
    return this.repo.remove(investorId, fundingRequestId);
  }

  findByInvestor(investorId: string) {
    return this.repo.findByInvestor(investorId);
  }

  async getStatus(investorId: string, fundingRequestId: string) {
    const favorited = await this.repo.isInWatchlist(investorId, fundingRequestId);
    return { favorited };
  }
}
