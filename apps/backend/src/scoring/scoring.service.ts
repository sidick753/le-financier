import { Injectable, Logger } from '@nestjs/common';
import { ScoringRepository } from './scoring.repository';
import { BAREME_VERSION, scoreFacture, scorePret, scoreEquity, ScoringResult } from './scoring.engine';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(private scoringRepository: ScoringRepository) {}

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
      // Pas de données scoring : score minimal avec confidence 0
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
        tauxImpaye12m:       input.tauxImpaye12m ? Number(input.tauxImpaye12m) : null,
        partPlusGrosClient:  input.partPlusGrosClient ? Number(input.partPlusGrosClient) : null,
      });
    } else if (product === 'PRET') {
      result = scorePret({
        cashFlowAnnuel:         input.cashFlowAnnuel       ? Number(input.cashFlowAnnuel)       : null,
        fluxMobileMoneyMensuel: input.fluxMobileMoneyMensuel ? Number(input.fluxMobileMoneyMensuel) : null,
        autonomieFinanciere:    input.autonomieFinanciere   ? Number(input.autonomieFinanciere)   : null,
        tauxEndettement:        input.tauxEndettement       ? Number(input.tauxEndettement)       : null,
        ratioLiquidite:         input.ratioLiquidite        ? Number(input.ratioLiquidite)        : null,
        garantieType:           input.garantieType,
        garantieCouverture:     input.garantieCouverture    ? Number(input.garantieCouverture)    : null,
        dirigeantExperienceAns: input.dirigeantExperienceAns,
        dirigeantAntecedents:   input.dirigeantAntecedents,
        dirigeantIncidentsLegaux: input.dirigeantIncidentsLegaux,
        secteurCode:            input.secteurCode,
        secteurSaisonnalite:    input.secteurSaisonnalite,
        secteurImportDevises:   input.secteurImportDevises,
        secteurSoutienPublic:   input.secteurSoutienPublic,
        amountRequested,
        durationMonths,
      });
    } else if (product === 'EQUITY') {
      result = scoreEquity({
        tcamCa3ans:          input.tcamCa3ans          ? Number(input.tcamCa3ans)          : null,
        tailleMarche:        input.tailleMarche,
        scalabilite:         input.scalabilite,
        experienceSecteurAns: input.experienceSecteurAns,
        trackRecord:         input.trackRecord,
        completudeEquipe:    input.completudeEquipe,
        moat:                input.moat,
        partMarcheRelative:  input.partMarcheRelative,
        runwayMois:          input.runwayMois,
        margeBrute:          input.margeBrute           ? Number(input.margeBrute)           : null,
        droitsInvestisseur:  input.droitsInvestisseur,
        transparence:        input.transparence,
      });
    } else {
      this.logger.warn(`Produit inconnu pour le scoring : ${product}`);
      return;
    }

    await this.scoringRepository.createReport({
      organizationId,
      fundingRequestId,
      product,
      result,
    });

    this.logger.log(
      `Scoring calculé — ${product} | ${fundingRequestId} | score=${result.autoScore} grade=${result.grade} conf=${result.confidence}`,
    );
  }

  async getReport(fundingRequestId: string) {
    return this.scoringRepository.findByFundingRequest(fundingRequestId);
  }

  getBaremeVersion(): string {
    return BAREME_VERSION;
  }
}
