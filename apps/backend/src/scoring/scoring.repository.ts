import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@le-financier/database';
import { ScoringResult } from './scoring.engine';

@Injectable()
export class ScoringRepository {
  private prisma = new PrismaClient();

  async findScoringInput(fundingRequestId: string) {
    return this.prisma.scoringInput.findUnique({
      where: { fundingRequestId },
    });
  }

  async createReport(params: {
    organizationId: string;
    fundingRequestId: string;
    product: string;
    result: ScoringResult;
  }) {
    const { organizationId, fundingRequestId, product, result } = params;
    return this.prisma.scoringReport.create({
      data: {
        organizationId,
        fundingRequestId,
        product,
        autoScore: result.autoScore,
        grade:     result.grade,
        gradeCapped: result.gradeCapped,
        coverage:  result.coverage,
        confidence: result.confidence,
        advanceRate: result.advanceRate ?? undefined,
        kpiSnapshot: result.kpiSnapshot as any,
        status: 'CALCULATED',
      },
    });
  }

  async findByFundingRequest(fundingRequestId: string) {
    return this.prisma.scoringReport.findFirst({
      where: { fundingRequestId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
