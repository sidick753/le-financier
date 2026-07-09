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

  // Profil de crédit de la PME — secteur, santé financière, dirigeant, équipe/gouvernance/
  // marché — partagé par toutes ses demandes de financement.
  async findOrganizationProfile(organizationId: string) {
    return this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
  }

  // ── Traçabilité des échecs de calcul (visible dashboard admin) ────────────
  async setScoringError(fundingRequestId: string, message: string) {
    await this.prisma.fundingRequest.update({
      where: { id: fundingRequestId },
      data: { scoringError: message },
    });
  }

  async clearScoringError(fundingRequestId: string) {
    await this.prisma.fundingRequest.update({
      where: { id: fundingRequestId },
      data: { scoringError: null },
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

  async findReportById(reportId: string) {
    return this.prisma.scoringReport.findUnique({
      where: { id: reportId },
      include: {
        organization: { select: { legalName: true } },
        fundingRequest: { select: { title: true, category: true } },
        validatedBy: { select: { firstName: true, lastName: true } },
      },
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
        organization: true,
        scoringInput:  true,
        scoringReports: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
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

  // ── Pondérations de scoring configurables ─────────────────────────────────
  async getAllWeightRows() {
    return this.prisma.scoringWeight.findMany();
  }

  async getWeightRows(product: string) {
    return this.prisma.scoringWeight.findMany({ where: { product } });
  }

  async saveWeights(product: string, weights: { key: string; label: string; weight: number }[]) {
    await this.prisma.$transaction(
      weights.map((c) =>
        this.prisma.scoringWeight.upsert({
          where: { product_criterionKey: { product, criterionKey: c.key } },
          create: { product, criterionKey: c.key, label: c.label, weight: c.weight },
          update: { weight: c.weight, label: c.label },
        }),
      ),
    );
  }
}
