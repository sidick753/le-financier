import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@le-financier/database';

@Injectable()
export class WatchlistRepository {
  private prisma = new PrismaClient();

  async add(investorId: string, fundingRequestId: string) {
    return this.prisma.watchlist.upsert({
      where: { investorId_fundingRequestId: { investorId, fundingRequestId } },
      create: { investorId, fundingRequestId },
      update: {},
    });
  }

  async remove(investorId: string, fundingRequestId: string) {
    return this.prisma.watchlist.deleteMany({
      where: { investorId, fundingRequestId },
    });
  }

  async findByInvestor(investorId: string) {
    return this.prisma.watchlist.findMany({
      where: { investorId },
      include: {
        fundingRequest: {
          include: {
            organization: { select: { legalName: true } },
            scoringReports: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async isInWatchlist(investorId: string, fundingRequestId: string) {
    const entry = await this.prisma.watchlist.findUnique({
      where: { investorId_fundingRequestId: { investorId, fundingRequestId } },
    });
    return entry !== null;
  }
}
