import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@le-financier/database';
import {
  IFundingRepository,
  CreateFundingRequestData,
  UpdateFundingRequestData,
  FundingAdminFilters,
} from './interfaces/funding-repository.interface';
import { ALL_SCORING_FIELDS } from '../scoring/scoring-fields';
import { PayoutClaimsRepository } from '../payout-claims/payout-claims.repository';

const FUNDING_FEE_RATE = 0.02;

function hasScoringData(data: CreateFundingRequestData): boolean {
  return ALL_SCORING_FIELDS.some((field) => data[field] !== undefined && data[field] !== null);
}

// Options de tri exposées aux investisseurs sur `GET /funding-requests/published`
// (voir `SORT_OPTIONS` côté frontend dans investor/explorer/page.tsx — les clés
// doivent rester identiques des deux côtés).
const PUBLISHED_SORT_ORDER: Record<string, Prisma.FundingRequestOrderByWithRelationInput> = {
  recent: { createdAt: 'desc' },
  amount_desc: { amountRequested: 'desc' },
  amount_asc: { amountRequested: 'asc' },
  return_desc: { expectedReturn: { sort: 'desc', nulls: 'last' } },
  closing_soon: { closesAt: { sort: 'asc', nulls: 'last' } },
};

// Regroupement du grade de scoring en niveau de risque investisseur (voir
// `gradeToRisk` côté frontend dans use-institution-data.ts — logique dupliquée
// volontairement, le backend n'a pas accès au code du frontend).
function gradeToRiskBucket(grade: string | null | undefined): 'FAIBLE' | 'MODERE' | 'ELEVE' | 'NON_NOTE' {
  if (!grade) return 'NON_NOTE';
  if (grade === 'A+' || grade === 'A') return 'FAIBLE';
  if (grade === 'BBB') return 'MODERE';
  return 'ELEVE';
}

@Injectable()
export class FundingRepository implements IFundingRepository {
  private prisma = new PrismaClient();

  constructor(private payoutClaims: PayoutClaimsRepository) {}

  async findById(id: string) {
    return this.prisma.fundingRequest.findUnique({
      where: { id },
      include: {
        organization: {
          include: {
            // Score PME indépendant (product='ORGANISATION') — distinct du score de
            // CETTE demande (scoringReports ci-dessous), utile à l'investisseur pour
            // évaluer la PME elle-même au-delà du dossier précis.
            scoringReports: {
              where: { product: 'ORGANISATION' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        scoringReports: { orderBy: { createdAt: 'desc' }, take: 1 },
        // Détail propre à CETTE demande (débiteur pour une facture, garantie
        // pour un prêt) — utile à l'investisseur pour évaluer le dossier,
        // en plus du profil général de la PME porté par `organization`.
        scoringInput: true,
      },
    });
  }

  async findByIdAdmin(id: string) {
    return this.prisma.fundingRequest.findUnique({
      where: { id },
      include: {
        // members : nécessaire pour que l'admin voie le contact (email/téléphone) du
        // propriétaire de la PME sans quitter la page d'opportunité.
        organization: {
          include: {
            members: {
              include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
            },
          },
        },
        documents: true,
        scoringReports: { orderBy: { createdAt: 'desc' }, take: 1 },
        investments: {
          include: {
            investor: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        payoutClaims: {
          where: { direction: 'FUNDING_TO_PME' },
          include: { requestedBy: { select: { firstName: true, lastName: true } } },
          orderBy: { requestedAt: 'desc' },
        },
      },
    });
  }

  async findAllByOrganizationId(organizationId: string) {
    return this.prisma.fundingRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { investments: true } },
      },
    });
  }

  async findAllPublished(filters?: {
    category?: string;
    search?: string;
    sort?: string;
    risk?: string;
    page?: number;
    limit?: number;
  }) {
    const where: Prisma.FundingRequestWhereInput = {
      status: 'PUBLISHED',
      ...(filters?.category ? { category: filters.category as any } : {}),
      ...(filters?.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { organization: { legalName: { contains: filters.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const { page, limit, risk } = filters ?? {};
    const hasPagination = page !== undefined && limit !== undefined;
    const orderBy = PUBLISHED_SORT_ORDER[filters?.sort ?? ''] ?? PUBLISHED_SORT_ORDER.recent;
    // Annotation explicite requise : sans elle, TS infère un type plain object
    // et ne peut pas réconcilier les littéraux ci-dessous (ex. 'NEGOTIATING')
    // avec les enums Prisma attendus (InvestmentStatus[], etc.).
    const includeArgs: Prisma.FundingRequestInclude = {
      organization: true,
      // Uniquement les rapports validés par un admin : un score encore auto
      // (CALCULATED/PENDING_VALIDATION) ne doit jamais orienter un investisseur
      // qui parcourt le marché (voir aussi FundingService.findOneWithDetails).
      scoringReports: { where: { status: 'VALIDATED' }, orderBy: { createdAt: 'desc' }, take: 1 },
      // Ne sert qu'aux dossiers SINGLE_INVESTOR : permet d'afficher "déjà pris"
      // sur les cards sans exposer les investissements eux-mêmes (voir
      // hasActiveInvestor plus bas dans ce fichier pour le détail à l'unité).
      _count: {
        select: {
          investments: {
            where: { status: { in: ['NEGOTIATING', 'COMMITTED', 'SETTLED_OFF_PLATFORM'] } },
          },
        },
      },
    };

    if (risk) {
      // Le grade retenu est celui du dernier ScoringReport (un dossier peut en
      // avoir plusieurs au fil des recalculs) : impossible à exprimer dans un
      // `where` Prisma sur la relation, donc on filtre/pagine en mémoire.
      const results = await this.prisma.fundingRequest.findMany({ where, include: includeArgs, orderBy });
      const filtered = results.filter((fr) => gradeToRiskBucket(fr.scoringReports[0]?.grade) === risk);
      const total = filtered.length;
      const page_ = hasPagination ? filtered.slice((page - 1) * limit, (page - 1) * limit + limit) : filtered;
      const data = page_.map(({ _count, ...fr }) => ({ ...fr, hasActiveInvestor: _count.investments > 0 }));
      return { data, total };
    }

    const [results, count] = await Promise.all([
      this.prisma.fundingRequest.findMany({
        where,
        include: includeArgs,
        orderBy,
        skip: hasPagination ? (page - 1) * limit : undefined,
        take: hasPagination ? limit : undefined,
      }),
      // Sans pagination, `results` contient déjà toutes les lignes : pas besoin d'un COUNT séparé.
      hasPagination ? this.prisma.fundingRequest.count({ where }) : Promise.resolve(undefined),
    ]);

    const data = results.map(({ _count, ...fr }) => ({ ...fr, hasActiveInvestor: _count.investments > 0 }));
    return { data, total: count ?? data.length };
  }

  async create(data: CreateFundingRequestData) {
    return this.prisma.$transaction(async (tx) => {
      const fundingRequest = await tx.fundingRequest.create({
        data: {
          organizationId: data.organizationId,
          title: data.title,
          description: data.description,
          category: data.category as any,
          amountRequested: data.amountRequested,
          expectedReturn: data.expectedReturn,
          durationMonths: data.durationMonths,
          investorMode: data.investorMode,
        },
      });

      if (hasScoringData(data)) {
        await tx.scoringInput.create({
          data: {
            fundingRequestId: fundingRequest.id,
            product: data.category,
            debiteurNom: data.debiteurNom,
            debiteurType: data.debiteurType,
            debiteurSolvabilite: data.debiteurSolvabilite,
            echeanceFactureDate: data.echeanceFactureDate ? new Date(data.echeanceFactureDate) : undefined,
            ancienneteRelation: data.ancienneteRelation,
            partPlusGrosClient: data.partPlusGrosClient,
            delaiPaiementMenu: data.delaiPaiementMenu,
            tauxImpaye12m: data.tauxImpaye12m,
            garantieType: data.garantieType,
            garantieCouverture: data.garantieCouverture,
          },
        });
      }

      return fundingRequest;
    });
  }

  async updateStatus(id: string, status: any, rejectionReason?: string) {
    return this.prisma.fundingRequest.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
      },
    });
  }

  async update(id: string, data: UpdateFundingRequestData) {
    return this.prisma.fundingRequest.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        category: data.category as any,
        amountRequested: data.amountRequested,
        expectedReturn: data.expectedReturn,
        durationMonths: data.durationMonths,
        investorMode: data.investorMode,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.fundingRequest.delete({ where: { id } });
  }

  // PME : montant déjà validé par un admin (amountRaised) mais pas encore réclamé.
  // Disponible dès qu'un investissement est validé — pas besoin d'attendre FUNDED.
  async getClaimableAmount(fundingRequestId: string) {
    const fundingRequest = await this.prisma.fundingRequest.findUniqueOrThrow({
      where: { id: fundingRequestId },
    });
    // Même restriction de statut que requestFundingClaim : sans elle, un dossier
    // CANCELLED/REJECTED avec des investissements déjà validés afficherait un solde
    // réclamable que la soumission rejetterait ensuite avec un 409.
    if (!['PUBLISHED', 'FUNDED'].includes(fundingRequest.status)) {
      return 0;
    }
    const claimed = await this.payoutClaims.sumClaimed(this.prisma as any, 'FUNDING_TO_PME', { fundingRequestId });
    return Number(fundingRequest.amountRaised) - claimed;
  }

  // PME : réclame tout ou partie des fonds déjà validés, avant même que le dossier
  // soit intégralement financé (FUNDED).
  async requestFundingClaim(fundingRequestId: string, userId: string, amount?: number) {
    return this.prisma.$transaction(async (tx) => {
      // Verrou de ligne : empêche deux réclamations concurrentes de lire le même
      // disponible avant que l'une des deux n'ait inséré la sienne.
      await tx.$queryRaw`SELECT id FROM funding_requests WHERE id = ${fundingRequestId} FOR UPDATE`;

      const fundingRequest = await tx.fundingRequest.findUnique({ where: { id: fundingRequestId } });
      if (!fundingRequest) throw new ConflictException('Demande introuvable.');
      if (!['PUBLISHED', 'FUNDED'].includes(fundingRequest.status)) {
        throw new ConflictException("Cette demande n'est pas éligible à une réclamation.");
      }

      const claimed = await this.payoutClaims.sumClaimed(tx, 'FUNDING_TO_PME', { fundingRequestId });
      const available = Number(fundingRequest.amountRaised) - claimed;

      // Plancher à 10% du disponible : évite le spam de micro-réclamations, chacune
      // nécessitant une validation admin. Spécifique à FUNDING_TO_PME — n'affecte pas
      // les réclamations de remboursement investisseur (validateAndCreate partagé).
      // "Tout" (amount omis) passe toujours ce seuil tant qu'il reste du disponible.
      const resolvedAmount = amount ?? available;
      if (available > 0 && resolvedAmount < available * 0.1) {
        throw new ConflictException(
          `Le montant réclamé doit représenter au moins 10% du disponible (minimum ${Math.ceil(available * 0.1).toLocaleString('fr-FR')}).`,
        );
      }

      return this.payoutClaims.validateAndCreate(
        tx,
        'FUNDING_TO_PME',
        { fundingRequestId },
        available,
        amount,
        userId,
      );
    });
  }

  // [ADMIN] Valide la réclamation : commission de financement prélevée au prorata du
  // montant réclamé, versement net à la PME. Dossier clôturé (CLOSED) dès que le
  // financement est complet (FUNDED) ET intégralement réclamé.
  async approveFundingClaim(claimId: string, adminId: string, proofDocumentId: string, paidAt: string) {
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.payoutClaim.findUnique({ where: { id: claimId } });
      if (!claim || claim.direction !== 'FUNDING_TO_PME' || !claim.fundingRequestId) {
        throw new ConflictException('Réclamation introuvable.');
      }
      if (claim.status !== 'REQUESTED') {
        throw new ConflictException("Cette réclamation n'est pas en attente de décision.");
      }

      // Verrou de ligne : empêche une approbation concurrente (ou une nouvelle demande)
      // de recalculer le disponible sur un état déjà obsolète.
      await tx.$queryRaw`SELECT id FROM funding_requests WHERE id = ${claim.fundingRequestId} FOR UPDATE`;

      const fundingRequest = await tx.fundingRequest.findUniqueOrThrow({
        where: { id: claim.fundingRequestId },
      });
      const claimed = await this.payoutClaims.sumClaimed(
        tx,
        'FUNDING_TO_PME',
        { fundingRequestId: claim.fundingRequestId },
        ['REQUESTED', 'PAID'],
        claimId,
      );
      const available = Number(fundingRequest.amountRaised) - claimed;
      if (Number(claim.amountRequested) > available) {
        throw new ConflictException('Le montant validé disponible a changé, réclamation à revoir.');
      }

      const commissionAmount = Number(claim.amountRequested) * FUNDING_FEE_RATE;
      const amountNet = Number(claim.amountRequested) - commissionAmount;

      await tx.commission.create({
        data: {
          type: 'FUNDING_FEE',
          fundingRequestId: claim.fundingRequestId,
          baseAmount: claim.amountRequested,
          rate: FUNDING_FEE_RATE,
          commissionAmount,
          status: 'COLLECTED',
        },
      });

      const updatedClaim = await this.payoutClaims.markPaid(tx, claimId, amountNet, adminId, proofDocumentId, paidAt);

      // CLOSED doit refléter un décaissement réellement complet : on ne compte ici que
      // les réclamations déjà PAID (jamais celles encore REQUESTED, qui peuvent être
      // rejetées) — sans quoi un dossier pourrait passer CLOSED alors qu'une autre
      // réclamation en attente n'a pas encore été décaissée, et rester bloqué CLOSED
      // si celle-ci est ensuite rejetée.
      const paidSum = await this.payoutClaims.sumClaimed(
        tx,
        'FUNDING_TO_PME',
        { fundingRequestId: claim.fundingRequestId },
        ['PAID'],
        claimId,
      );
      const totalPaidGross = paidSum + Number(claim.amountRequested);
      const newStatus =
        fundingRequest.status === 'FUNDED' && totalPaidGross >= Number(fundingRequest.amountRaised)
          ? 'CLOSED'
          : fundingRequest.status;

      await tx.fundingRequest.update({
        where: { id: claim.fundingRequestId },
        data: {
          status: newStatus,
          disbursedAt: new Date(),
          disbursedAmount: Number(fundingRequest.disbursedAmount ?? 0) + amountNet,
          disbursedById: adminId,
        },
      });

      return updatedClaim;
    });
  }

  async rejectFundingClaim(claimId: string, adminId: string, reason: string) {
    return this.payoutClaims.reject(claimId, 'FUNDING_TO_PME', adminId, reason);
  }

  async findClaimsForFundingRequest(fundingRequestId: string) {
    return this.payoutClaims.findMany('FUNDING_TO_PME', { fundingRequestId });
  }

  async findPendingFundingClaims() {
    return this.prisma.payoutClaim.findMany({
      where: { direction: 'FUNDING_TO_PME', status: 'REQUESTED' },
      include: {
        fundingRequest: { select: { id: true, title: true, currency: true } },
        requestedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { requestedAt: 'asc' },
    });
  }

  // Utilisé uniquement pour les demandes en mode SINGLE_INVESTOR : indique si un
  // investisseur a déjà pris la place exclusive (NEGOTIATING/COMMITTED/SETTLED),
  // avant même que amountRaised ne bouge (qui ne reflète que le SETTLED_OFF_PLATFORM,
  // voir InvestmentsRepository.approveSettlement). Sert à éviter qu'un second
  // investisseur ne tente un engagement voué à l'échec sans comprendre pourquoi.
  async hasActiveInvestor(fundingRequestId: string): Promise<boolean> {
    const count = await this.prisma.investment.count({
      where: {
        fundingRequestId,
        status: { in: ['NEGOTIATING', 'COMMITTED', 'SETTLED_OFF_PLATFORM'] },
      },
    });
    return count > 0;
  }

  // Dévoile les coordonnées bancaires de la PME (cf. findOneWithDetails) une fois
  // l'engagement confirmé — pas avant, pour ne jamais les exposer à un investisseur
  // qui ne fait que consulter l'opportunité.
  async hasCommittedInvestment(fundingRequestId: string, investorIds: string[]): Promise<boolean> {
    const count = await this.prisma.investment.count({
      where: {
        fundingRequestId,
        investorId: { in: investorIds },
        status: { in: ['COMMITTED', 'SETTLEMENT_SUBMITTED', 'SETTLED_OFF_PLATFORM'] },
      },
    });
    return count > 0;
  }

  // [CRON] Dossiers en révision depuis `daysAgo` jours pile (fenêtre d'un jour
  // civil) — sert de relance admin sur un backlog qui stagne. Bornée à un seul
  // jour comme les rappels d'échéance : évite de renotifier le même dossier à
  // chaque passage tant qu'aucune autre action n'a touché `updatedAt` entretemps.
  async findStaleUnderReview(daysAgo: number) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return this.prisma.fundingRequest.findMany({
      where: { status: 'UNDER_REVIEW', updatedAt: { gte: start, lt: end } },
      select: { id: true, title: true },
    });
  }

  async findOrganizationOwner(organizationId: string) {
    return this.prisma.organizationMember.findFirst({
      where: { organizationId, role: 'OWNER' },
    });
  }

  async findAllForAdmin(filters?: FundingAdminFilters) {
    const where: Prisma.FundingRequestWhereInput = {
      ...(filters?.status ? { status: filters.status as any } : {}),
      ...(filters?.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { organization: { legalName: { contains: filters.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const { page, limit } = filters ?? {};
    const hasPagination = page !== undefined && limit !== undefined;

    const [data, count] = await Promise.all([
      this.prisma.fundingRequest.findMany({
        where,
        include: {
          organization: { select: { legalName: true } },
          _count: { select: { investments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: hasPagination ? (page - 1) * limit : undefined,
        take: hasPagination ? limit : undefined,
      }),
      hasPagination ? this.prisma.fundingRequest.count({ where }) : Promise.resolve(undefined),
    ]);

    // Preuves de virement soumises en attente de validation, par demande — sert de
    // badge sur la ligne concernée dans la liste admin (pas juste dans son détail).
    const pendingSettlements = await this.prisma.investment.groupBy({
      by: ['fundingRequestId'],
      where: { fundingRequestId: { in: data.map((fr) => fr.id) }, status: 'SETTLEMENT_SUBMITTED' },
      _count: { _all: true },
    });
    const pendingSettlementsByRequest = new Map(
      pendingSettlements.map((p) => [p.fundingRequestId, p._count._all]),
    );

    // Réclamations de décaissement (PayoutClaim) en attente, par demande — même logique
    // que les preuves de virement ci-dessus : ces réclamations comptent dans le badge
    // "Opportunités" du menu admin, donc la ligne concernée doit aussi être signalée.
    const pendingClaims = await this.prisma.payoutClaim.groupBy({
      by: ['fundingRequestId'],
      where: {
        fundingRequestId: { in: data.map((fr) => fr.id) },
        direction: 'FUNDING_TO_PME',
        status: 'REQUESTED',
      },
      _count: { _all: true },
    });
    const pendingClaimsByRequest = new Map(
      pendingClaims.map((c) => [c.fundingRequestId, c._count._all]),
    );

    return {
      data: data.map((fr) => ({
        ...fr,
        pendingSettlementsCount: pendingSettlementsByRequest.get(fr.id) ?? 0,
        pendingClaimsCount: pendingClaimsByRequest.get(fr.id) ?? 0,
      })),
      total: count ?? data.length,
    };
  }

  async getAdminStats() {
    const [total, underReview, published, funded, closed, raised] = await Promise.all([
      this.prisma.fundingRequest.count(),
      this.prisma.fundingRequest.count({ where: { status: 'UNDER_REVIEW' } }),
      this.prisma.fundingRequest.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.fundingRequest.count({ where: { status: 'FUNDED' } }),
      this.prisma.fundingRequest.count({ where: { status: { in: ['CLOSED', 'CANCELLED'] } } }),
      this.prisma.fundingRequest.aggregate({ _sum: { amountRaised: true } }),
    ]);
    return {
      total,
      underReview,
      published,
      funded,
      closed,
      totalRaised: Number(raised._sum.amountRaised ?? 0),
    };
  }
}
