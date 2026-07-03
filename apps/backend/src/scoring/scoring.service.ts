import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ScoringRepository } from './scoring.repository';
import { BAREME_VERSION, scoreFacture, scorePret, scoreEquity, ScoringResult } from './scoring.engine';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(private scoringRepository: ScoringRepository) {}

  // ── Calcul (appelé par FundingService.submitForReview ou admin) ───────────

  async computeAndSave(params: {
    fundingRequestId: string;
    organizationId: string;
    product: string;
    amountRequested?: number;
    durationMonths?: number;
  }): Promise<void> {
    const { fundingRequestId, organizationId, product, amountRequested, durationMonths } = params;

    const input = await this.scoringRepository.findScoringInput(fundingRequestId);

    let result: ScoringResult;

    if (!input) {
      result = {
        autoScore:   0,
        grade:       'B',
        gradeCapped: false,
        coverage:    0,
        confidence:  0,
        advanceRate: product === 'FACTURE' ? 0.40 : null,
        kpiSnapshot: { note: 'Aucune donnée de scoring soumise' },
      };
    } else if (product === 'FACTURE') {
      result = scoreFacture({
        debiteurType:        input.debiteurType,
        debiteurSolvabilite: input.debiteurSolvabilite,
        ancienneteRelation:  input.ancienneteRelation,
        delaiPaiementMenu:   input.delaiPaiementMenu,
        tauxImpaye12m:       input.tauxImpaye12m       ? Number(input.tauxImpaye12m)       : null,
        partPlusGrosClient:  input.partPlusGrosClient  ? Number(input.partPlusGrosClient)  : null,
      });
    } else if (product === 'PRET') {
      result = scorePret({
        cashFlowAnnuel:          input.cashFlowAnnuel          ? Number(input.cashFlowAnnuel)          : null,
        fluxMobileMoneyMensuel:  input.fluxMobileMoneyMensuel  ? Number(input.fluxMobileMoneyMensuel)  : null,
        autonomieFinanciere:     input.autonomieFinanciere      ? Number(input.autonomieFinanciere)      : null,
        tauxEndettement:         input.tauxEndettement          ? Number(input.tauxEndettement)          : null,
        ratioLiquidite:          input.ratioLiquidite           ? Number(input.ratioLiquidite)           : null,
        garantieType:            input.garantieType,
        garantieCouverture:      input.garantieCouverture       ? Number(input.garantieCouverture)       : null,
        dirigeantExperienceAns:  input.dirigeantExperienceAns,
        dirigeantAntecedents:    input.dirigeantAntecedents,
        dirigeantIncidentsLegaux: input.dirigeantIncidentsLegaux,
        secteurCode:             input.secteurCode,
        secteurSaisonnalite:     input.secteurSaisonnalite,
        secteurImportDevises:    input.secteurImportDevises,
        secteurSoutienPublic:    input.secteurSoutienPublic,
        amountRequested,
        durationMonths,
      });
    } else if (product === 'EQUITY') {
      result = scoreEquity({
        tcamCa3ans:           input.tcamCa3ans           ? Number(input.tcamCa3ans)           : null,
        tailleMarche:         input.tailleMarche,
        scalabilite:          input.scalabilite,
        experienceSecteurAns: input.experienceSecteurAns,
        trackRecord:          input.trackRecord,
        completudeEquipe:     input.completudeEquipe,
        moat:                 input.moat,
        partMarcheRelative:   input.partMarcheRelative,
        runwayMois:           input.runwayMois,
        margeBrute:           input.margeBrute            ? Number(input.margeBrute)            : null,
        droitsInvestisseur:   input.droitsInvestisseur,
        transparence:         input.transparence,
      });
    } else {
      this.logger.warn(`Produit inconnu pour le scoring : ${product}`);
      return;
    }

    await this.scoringRepository.createReport({ organizationId, fundingRequestId, product, result });

    this.logger.log(
      `Scoring calculé — ${product} | ${fundingRequestId} | score=${result.autoScore} grade=${result.grade} conf=${result.confidence}`,
    );
  }

  // ── Déclenchement manuel depuis l'interface admin ─────────────────────────

  async computeForAdmin(fundingRequestId: string): Promise<void> {
    const fr = await this.scoringRepository.findFundingRequestForScoring(fundingRequestId);
    if (!fr) throw new NotFoundException('Demande de financement introuvable.');

    await this.computeAndSave({
      fundingRequestId: fr.id,
      organizationId:  fr.organizationId,
      product:         fr.category as string,
      amountRequested: Number(fr.amountRequested),
      durationMonths:  fr.durationMonths ?? undefined,
    });
  }

  // ── Validation d'un rapport (analyste) ───────────────────────────────────

  async validateReport(reportId: string, validatedById: string, validatedScore?: number, notes?: string) {
    return this.scoringRepository.validateReport(reportId, { validatedById, validatedScore, validationNotes: notes });
  }

  // ── Lecture ───────────────────────────────────────────────────────────────

  async getReport(fundingRequestId: string) {
    return this.scoringRepository.findByFundingRequest(fundingRequestId);
  }

  async getReportById(reportId: string) {
    const report = await this.scoringRepository.findReportById(reportId);
    if (!report) throw new NotFoundException('Rapport introuvable.');
    return report;
  }

  getBaremeVersion(): string {
    return BAREME_VERSION;
  }

  // ── Dashboard admin ────────────────────────────────────────────────────────

  async getDashboard() {
    const fundingRequests = await this.scoringRepository.findDashboard();

    return fundingRequests.map((fr) => {
      const latestReport = (fr as any).scoringReports?.[0];
      const docCount = (fr as any).documents?.length ?? 0;
      const completude = Math.min(100, Math.round((docCount / 5) * 100));

      let scoringStatus = 'A_SCORER';
      if (latestReport) {
        scoringStatus = latestReport.status;
      } else if (!(fr as any).scoringInput) {
        scoringStatus = 'A_COMPLETER';
      }

      return {
        id:            fr.id,
        pme:           (fr as any).organization.legalName,
        product:       fr.category,
        amount:        fr.amountRequested,
        submittedAt:   fr.createdAt,
        completude,
        scoringStatus,
        grade:         latestReport?.grade ?? null,
        score:         latestReport?.autoScore ? Number(latestReport.autoScore) : null,
        reportId:      latestReport?.id ?? null,
      };
    });
  }

  // ── Historique admin ──────────────────────────────────────────────────────

  async getHistory() {
    const reports = await this.scoringRepository.findHistory();

    const total = reports.length;
    const published = reports.filter((r) => r.status === 'VALIDATED').length;
    const avgScore =
      total > 0
        ? reports.reduce((sum, r) => sum + Number(r.autoScore), 0) / total
        : 0;

    return {
      stats: {
        total,
        published,
        avgScore: Math.round(avgScore * 10) / 10,
        baremeVersions: [...new Set(reports.map((r) => r.bareme_version))],
      },
      reports,
    };
  }
}
