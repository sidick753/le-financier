import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ScoringRepository } from './scoring.repository';
import {
  BAREME_VERSION, scoreFacture, scorePret, scoreEquity, ScoringResult,
  CRITERIA_BY_PRODUCT, WeightCriterion, WeightMap,
} from './scoring.engine';
import { SCORING_FIELDS_BY_PRODUCT, ORG_PROFILE_FIELDS_BY_PRODUCT } from './scoring-fields';

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

    try {
      await this.computeAndSaveOrThrow({ fundingRequestId, organizationId, product, amountRequested, durationMonths });
      await this.scoringRepository.clearScoringError(fundingRequestId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue lors du calcul du scoring.';
      this.logger.error(`Échec du calcul de scoring — ${product} | ${fundingRequestId} : ${message}`);
      await this.scoringRepository.setScoringError(fundingRequestId, message);
      throw err;
    }
  }

  private async computeAndSaveOrThrow(params: {
    fundingRequestId: string;
    organizationId: string;
    product: string;
    amountRequested?: number;
    durationMonths?: number;
  }): Promise<void> {
    const { fundingRequestId, organizationId, product, amountRequested, durationMonths } = params;

    // `input` = données propres à CETTE demande (ScoringInput) ; `organization` = profil de
    // crédit de la PME (secteur, santé financière, dirigeant, équipe/gouvernance/marché),
    // partagé par toutes ses demandes. Les deux sont fusionnés pour construire l'input du moteur.
    const [input, organization] = await Promise.all([
      this.scoringRepository.findScoringInput(fundingRequestId),
      this.scoringRepository.findOrganizationProfile(organizationId),
    ]);
    const weightMap = await this.getWeightMap(product);

    let result: ScoringResult;

    // Champs absents des deux sources → ratio non évaluable pour chaque critère, donc
    // score 0 / grade B / confidence 0 : le moteur dégrade déjà gracieusement, pas besoin
    // de cas particulier ici.
    if (product === 'FACTURE') {
      result = scoreFacture({
        debiteurType:        input?.debiteurType ?? null,
        debiteurSolvabilite: input?.debiteurSolvabilite ?? null,
        ancienneteRelation:  input?.ancienneteRelation ?? null,
        delaiPaiementMenu:   input?.delaiPaiementMenu ?? null,
        tauxImpaye12m:       input?.tauxImpaye12m       ? Number(input.tauxImpaye12m)       : null,
        partPlusGrosClient:  input?.partPlusGrosClient  ? Number(input.partPlusGrosClient)  : null,
        nbClientsActifs:     organization?.nbClientsActifs ?? null,
      }, weightMap);
    } else if (product === 'PRET') {
      result = scorePret({
        cashFlowAnnuel:          organization?.cashFlowAnnuel          ? Number(organization.cashFlowAnnuel)          : null,
        fluxMobileMoneyMensuel:  organization?.fluxMobileMoneyMensuel  ? Number(organization.fluxMobileMoneyMensuel)  : null,
        autonomieFinanciere:     organization?.autonomieFinanciere      ? Number(organization.autonomieFinanciere)      : null,
        tauxEndettement:         organization?.tauxEndettement          ? Number(organization.tauxEndettement)          : null,
        ratioLiquidite:          organization?.ratioLiquidite           ? Number(organization.ratioLiquidite)           : null,
        garantieType:            input?.garantieType ?? null,
        garantieCouverture:      input?.garantieCouverture       ? Number(input.garantieCouverture)       : null,
        dirigeantExperienceAns:  organization?.dirigeantExperienceAns ?? null,
        dirigeantAntecedents:    organization?.dirigeantAntecedents ?? null,
        dirigeantIncidentsLegaux: organization?.dirigeantIncidentsLegaux ?? null,
        secteurCode:             organization?.secteurCode ?? null,
        secteurSaisonnalite:     organization?.secteurSaisonnalite ?? null,
        secteurImportDevises:    organization?.secteurImportDevises ?? null,
        secteurSoutienPublic:    organization?.secteurSoutienPublic ?? null,
        amountRequested,
        durationMonths,
      }, weightMap);
    } else if (product === 'EQUITY') {
      result = scoreEquity({
        tcamCa3ans:           organization?.tcamCa3ans           ? Number(organization.tcamCa3ans)           : null,
        tailleMarche:         organization?.tailleMarche ?? null,
        scalabilite:          organization?.scalabilite ?? null,
        experienceSecteurAns: organization?.experienceSecteurAns ?? null,
        trackRecord:          organization?.trackRecord ?? null,
        completudeEquipe:     organization?.completudeEquipe ?? null,
        moat:                 organization?.moat ?? null,
        partMarcheRelative:   organization?.partMarcheRelative ?? null,
        runwayMois:           organization?.runwayMois ?? null,
        margeBrute:           organization?.margeBrute            ? Number(organization.margeBrute)            : null,
        droitsInvestisseur:   organization?.droitsInvestisseur ?? null,
        transparence:         organization?.transparence ?? null,
      }, weightMap);
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
      const completude = this.computeCompletude(fr, latestReport);

      let scoringStatus = 'A_SCORER';
      if ((fr as any).scoringError) {
        scoringStatus = 'ERREUR_CALCUL';
      } else if (latestReport) {
        scoringStatus = latestReport.status;
      } else if (completude === 0) {
        // Ni la demande (ScoringInput) ni le profil de crédit de la PME (Organization)
        // n'ont de donnée exploitable pour ce produit.
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
        scoringError:  (fr as any).scoringError ?? null,
      };
    });
  }

  // Complétude d'un dossier : une fois scoré, on reprend la confiance pondérée
  // du moteur (plus fine — un champ à fort poids manquant pèse plus qu'un champ
  // secondaire). Avant le premier calcul, on retombe sur un simple ratio de champs
  // renseignés parmi ceux pertinents pour la catégorie — à la fois sur la demande
  // (ScoringInput) et sur le profil de crédit de la PME (Organization).
  private computeCompletude(fr: any, latestReport: any): number {
    if (latestReport?.confidence != null) {
      return Math.round(Number(latestReport.confidence) * 100);
    }

    const requestFields = SCORING_FIELDS_BY_PRODUCT[fr.category] ?? [];
    const orgFields = ORG_PROFILE_FIELDS_BY_PRODUCT[fr.category] ?? [];
    const relevantFields = requestFields.length + orgFields.length;
    if (relevantFields === 0) return 0;

    const scoringInput = fr.scoringInput ?? {};
    const organization = fr.organization ?? {};

    const filledCount =
      requestFields.filter((f) => scoringInput[f] !== null && scoringInput[f] !== undefined).length +
      orgFields.filter((f) => organization[f] !== null && organization[f] !== undefined).length;

    return Math.round((filledCount / relevantFields) * 100);
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

  // ── Pondérations de scoring configurables ─────────────────────────────────

  async getWeightConfigs(): Promise<Record<string, WeightCriterion[]>> {
    const rows = await this.scoringRepository.getAllWeightRows();
    const overrides = new Map(rows.map((r) => [`${r.product}:${r.criterionKey}`, Number(r.weight)]));

    const result: Record<string, WeightCriterion[]> = {};
    for (const [product, criteria] of Object.entries(CRITERIA_BY_PRODUCT)) {
      result[product] = criteria.map((c) => ({
        key:    c.key,
        label:  c.label,
        weight: overrides.get(`${product}:${c.key}`) ?? c.weight,
      }));
    }
    return result;
  }

  async updateWeights(product: string, weights: { key: string; weight: number }[]) {
    const criteria = CRITERIA_BY_PRODUCT[product];
    if (!criteria) throw new BadRequestException('Produit de scoring inconnu.');

    const validKeys = new Set(criteria.map((c) => c.key));
    if (weights.length !== criteria.length || weights.some((w) => !validKeys.has(w.key))) {
      throw new BadRequestException('Toutes les pondérations du produit doivent être fournies avec des critères valides.');
    }
    if (weights.some((w) => !Number.isFinite(w.weight) || w.weight < 1 || w.weight > 100)) {
      throw new BadRequestException('Chaque pondération doit être un nombre entre 1 et 100.');
    }
    const total = weights.reduce((s, w) => s + w.weight, 0);
    if (total !== 100) {
      throw new BadRequestException(`La somme des pondérations doit être égale à 100 (actuellement ${total}).`);
    }

    const labelByKey = new Map(criteria.map((c) => [c.key, c.label]));
    await this.scoringRepository.saveWeights(
      product,
      weights.map((w) => ({ key: w.key, label: labelByKey.get(w.key)!, weight: w.weight })),
    );

    this.logger.log(`Pondérations de scoring mises à jour — ${product} : ${JSON.stringify(weights)}`);
  }

  private async getWeightMap(product: string): Promise<WeightMap> {
    const criteria = CRITERIA_BY_PRODUCT[product];
    if (!criteria) return {};

    const rows = await this.scoringRepository.getWeightRows(product);
    const overrides = new Map(rows.map((r) => [r.criterionKey, Number(r.weight)]));
    return Object.fromEntries(criteria.map((c) => [c.key, overrides.get(c.key) ?? c.weight]));
  }
}
