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
        autoScore:   result.autoScore,
        grade:       result.grade,
        gradeCapped: result.gradeCapped,
        coverage:    result.coverage,
        confidence:  result.confidence,
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

  // ── Lookup d'une FundingRequest pour le scoring admin ─────────────────────
  async findFundingRequestForScoring(fundingRequestId: string) {
    return this.prisma.fundingRequest.findUnique({
      where: { id: fundingRequestId },
      select: {
        id: true,
        organizationId: true,
        category: true,
        amountRequested: true,
        durationMonths: true,
      },
    });
  }

  // ── Dashboard admin : toutes les demandes à scorer ─────────────────────────
  async findDashboard() {
    return this.prisma.fundingRequest.findMany({
      where: { status: { in: ['UNDER_REVIEW', 'PUBLISHED', 'FUNDED'] as any[] } },
      include: {
        organization: { select: { legalName: true } },
        scoringInput:  { select: { product: true } },
        scoringReports: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        documents: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Historique scoring (100 derniers rapports) ─────────────────────────────
  async findHistory() {
    return this.prisma.scoringReport.findMany({
      include: {
        organization: { select: { legalName: true } },
        fundingRequest: { select: { title: true, category: true } },
        validatedBy:   { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ── Validation d'un rapport ────────────────────────────────────────────────
  async validateReport(reportId: string, data: {
    validatedById: string;
    validatedScore?: number;
    validationNotes?: string;
  }) {
    return this.prisma.scoringReport.update({
      where: { id: reportId },
      data: {
        status: 'VALIDATED',
        validatedById:   data.validatedById,
        validatedScore:  data.validatedScore ?? undefined,
        validationNotes: data.validationNotes ?? undefined,
        validatedAt:     new Date(),
      },
    });
  }
}
