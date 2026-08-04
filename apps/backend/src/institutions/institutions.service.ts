import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { InstitutionsRepository } from './institutions.repository';
import { UpdateInstitutionProfileDto } from './dto/update-institution-profile.dto';
import { UpdateInstitutionLimitsDto } from './dto/update-institution-limits.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService, renderEmail } from '../mail/mail.service';
import { AmlAlertType } from '@le-financier/database';

const FRONTEND_URL = process.env.FRONTEND_URL ?? '';

// Seuil par défaut de "transaction inhabituelle" quand l'institution n'a pas
// déclaré de ticketMax — utilisé par InstitutionsService.evaluateInvestmentSettlement.
const SEUIL_TRANSACTION_INHABITUELLE_DEFAUT = 10_000_000;

// Libellés alignés sur apps/frontend/src/app/institution/risques/page.tsx pour
// que la notification pushée corresponde à ce que l'officier conformité voit
// ensuite dans le tableau des alertes.
const AML_ALERT_LABELS: Record<AmlAlertType, string> = {
  TRANSACTION_INHABITUELLE: 'Transaction inhabituelle',
  PEP_DETECTE: 'PEP détecté (screening)',
  BENEFICIAIRE_NON_IDENTIFIE: 'Bénéficiaire tiers non identifié',
};

@Injectable()
export class InstitutionsService {
  constructor(
    private institutionsRepository: InstitutionsRepository,
    private notificationsService: NotificationsService,
    private mailService: MailService,
  ) {}

  // ── Rattachement institution (auto-provisionné au premier accès) ──────────

  private async getOrProvisionMembership(userId: string) {
    const membership = await this.institutionsRepository.findMembershipByUserId(userId);
    if (membership) return membership;
    return this.institutionsRepository.provisionInstitution(userId);
  }

  private toProfileDto(institution: any) {
    const { apiKeyHash, ...rest } = institution;
    return rest;
  }

  // ── Représentation institution ─────────────────────────────────────────
  // Un membre agit toujours au nom de son institution : les investissements/
  // négociations/remboursements appartiennent à l'institution, jamais à la
  // personne qui a cliqué. Utilisé par InvestmentsService et RepaymentService
  // pour raisonner par institution plutôt que par utilisateur exact.

  // Investisseur indépendant (pas de membership) → juste lui-même.
  async getFellowMemberUserIds(userId: string): Promise<string[]> {
    const membership = await this.institutionsRepository.findMembershipByUserId(userId);
    if (!membership) return [userId];
    return this.institutionsRepository.findMemberUserIds(membership.institutionId);
  }

  async isSameInstitutionMember(userIdA: string, userIdB: string): Promise<boolean> {
    if (userIdA === userIdB) return true;
    const [a, b] = await Promise.all([
      this.institutionsRepository.findMembershipByUserId(userIdA),
      this.institutionsRepository.findMembershipByUserId(userIdB),
    ]);
    return !!a && !!b && a.institutionId === b.institutionId;
  }

  // Utilisé par InvestmentsService avant qu'une négociation ne soit créée : la PME
  // ne doit jamais voir une offre venant d'une identité pas encore vérifiée par un admin.
  async getRepresentativeKycStatus(userId: string) {
    return this.institutionsRepository.findRepresentativeKycStatus(userId);
  }

  // ── Profil ──────────────────────────────────────────────────────────────

  async getMine(userId: string) {
    const membership = await this.getOrProvisionMembership(userId);
    const institution = await this.institutionsRepository.findInstitutionById(membership.institutionId);
    return this.toProfileDto(institution);
  }

  async updateProfile(userId: string, dto: UpdateInstitutionProfileDto) {
    const membership = await this.getOrProvisionMembership(userId);
    const institution = await this.institutionsRepository.updateProfile(membership.institutionId, dto);
    return this.toProfileDto(institution);
  }

  async updateLimits(userId: string, dto: UpdateInstitutionLimitsDto) {
    const membership = await this.getOrProvisionMembership(userId);
    const institution = await this.institutionsRepository.updateLimits(membership.institutionId, dto);
    return this.toProfileDto(institution);
  }

  async regenerateApiKey(userId: string) {
    const membership = await this.getOrProvisionMembership(userId);
    const plainKey = `lf_live_sk_${crypto.randomBytes(24).toString('hex')}`;
    const apiKeyHash = await bcrypt.hash(plainKey, 12);
    const apiKeyLastFour = plainKey.slice(-4);

    await this.institutionsRepository.setApiKey(membership.institutionId, apiKeyHash, apiKeyLastFour);

    return { apiKey: plainKey, apiKeyLastFour };
  }

  // ── Membres ────────────────────────────────────────────────────────────

  async getMembers(userId: string) {
    const membership = await this.getOrProvisionMembership(userId);
    return this.institutionsRepository.findMembersWithStats(membership.institutionId);
  }

  async inviteMember(userId: string, dto: InviteMemberDto) {
    const membership = await this.getOrProvisionMembership(userId);
    if (membership.role !== 'OWNER') {
      throw new ForbiddenException("Seul le propriétaire de l'institution peut inviter des membres.");
    }

    const existing = await this.institutionsRepository.findUserByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const temporaryPassword = crypto.randomBytes(6).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const member = await this.institutionsRepository.createMember(membership.institutionId, {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash,
      role: dto.role,
      specialty: dto.specialty,
    });

    // Jusqu'ici le mot de passe temporaire n'existait que dans la réponse HTTP —
    // le membre invité ne recevait strictement rien. L'email est le seul canal
    // possible à cet instant : il n'a encore aucune session pour voir une notif
    // in-app (mais on lui en laisse une, prête à son premier login).
    const title = 'Invitation à rejoindre votre institution sur LeFinancier';
    await this.mailService.send(
      dto.email,
      title,
      renderEmail(
        title,
        `Bonjour ${dto.firstName}, vous avez été invité(e) à rejoindre votre institution sur LeFinancier. Votre mot de passe temporaire : <strong>${temporaryPassword}</strong>. Connectez-vous puis changez-le dès que possible.`,
        { label: 'Se connecter', url: `${FRONTEND_URL}/login` },
      ),
    );
    await this.notificationsService.notify(
      member.userId,
      'Bienvenue dans votre institution',
      'Vous avez été ajouté(e) comme membre. Pensez à changer votre mot de passe temporaire.',
    );

    return {
      message: 'Membre invité — ses identifiants (mot de passe temporaire) lui ont été envoyés par email.',
      temporaryPassword,
    };
  }

  private async assertOwnerAndGetMember(userId: string, memberId: string) {
    const membership = await this.getOrProvisionMembership(userId);
    if (membership.role !== 'OWNER') {
      throw new ForbiddenException("Seul le propriétaire de l'institution peut gérer les membres.");
    }
    const member = await this.institutionsRepository.findMemberById(memberId);
    if (!member || member.institutionId !== membership.institutionId) {
      throw new NotFoundException('Membre introuvable.');
    }
    return { membership, member };
  }

  async updateMember(userId: string, memberId: string, dto: UpdateMemberDto) {
    const { member } = await this.assertOwnerAndGetMember(userId, memberId);
    const updated = await this.institutionsRepository.updateMember(memberId, dto);

    // Le membre visé n'apprenait jusqu'ici jamais qu'on venait de changer son rôle
    // (ex. rétrogradé d'OWNER, ou passé COMPLIANCE) — pertinent surtout parce que
    // ça change ce qu'il peut faire sur la plateforme dès sa prochaine action.
    if (dto.role && dto.role !== member.role) {
      await this.notificationsService.notify(
        member.userId,
        'Votre rôle a changé',
        `Votre rôle au sein de votre institution est désormais : ${dto.role}.`,
        undefined,
        { email: true },
      );
    }

    return updated;
  }

  async removeMember(userId: string, memberId: string) {
    const { membership, member } = await this.assertOwnerAndGetMember(userId, memberId);
    if (member.id === membership.id) {
      throw new ForbiddenException('Vous ne pouvez pas vous retirer vous-même.');
    }
    await this.institutionsRepository.removeMember(memberId);

    // Le compte utilisateur n'est pas supprimé (seul le rattachement à
    // l'institution l'est) — encore joignable, donc encore informable.
    await this.notificationsService.notify(
      member.userId,
      'Retrait de votre institution',
      "Vous avez été retiré(e) de votre institution sur LeFinancier. Contactez son propriétaire pour plus de détails.",
      undefined,
      { email: true },
    );

    return { message: 'Membre retiré.' };
  }

  // ── Risques ────────────────────────────────────────────────────────────

  async getRiskIndicators(userId: string) {
    const membership = await this.getOrProvisionMembership(userId);
    const data = await this.institutionsRepository.computeRiskIndicators(membership.institutionId);

    const npl = data.npl > 0 ? { value: Math.round((data.nplOverdue / data.npl) * 1000) / 10, disponible: true } : { value: null, disponible: false };
    const concentrationSectorielle =
      data.concentrationSectorielle !== null
        ? { value: Math.round(data.concentrationSectorielle * 10) / 10, disponible: true }
        : { value: null, disponible: false };
    const couvertureGaranties =
      data.couvertureGaranties !== null
        ? { value: Math.round(data.couvertureGaranties * 10) / 10, disponible: true }
        : { value: null, disponible: false };

    return { npl, concentrationSectorielle, couvertureGaranties };
  }

  // ── AML / LAB-CFT ──────────────────────────────────────────────────────

  async getAmlAlerts(userId: string) {
    const membership = await this.getOrProvisionMembership(userId);
    const alerts = await this.institutionsRepository.findAmlAlerts(membership.institutionId);

    const now = new Date();
    const alertesActives = alerts.filter((a) => a.status !== 'RESOLU').length;
    const casBloques = alerts.filter((a) => a.status === 'BLOQUE').length;
    const resolusCeMois = alerts.filter(
      (a) =>
        a.status === 'RESOLU' &&
        a.resolvedAt &&
        a.resolvedAt.getMonth() === now.getMonth() &&
        a.resolvedAt.getFullYear() === now.getFullYear(),
    ).length;

    return {
      stats: { alertesActives, casBloques, resolusCeMois },
      alerts,
    };
  }

  async resolveAmlAlert(userId: string, alertId: string) {
    const membership = await this.getOrProvisionMembership(userId);
    const alert = await this.institutionsRepository.findAmlAlertById(alertId);
    if (!alert || alert.institutionId !== membership.institutionId) {
      throw new NotFoundException('Alerte introuvable.');
    }
    return this.institutionsRepository.resolveAmlAlert(alertId);
  }

  // Moteur de détection — appelé à la validation admin d'un virement d'investissement
  // (InvestmentsService.approveSettlement), seul point où de l'argent réel part vers
  // une PME. Ne s'applique qu'aux investisseurs membres d'une institution : un
  // investisseur indépendant n'a pas de tableau de bord de conformité à alimenter.
  async evaluateInvestmentSettlement(params: {
    investorId: string;
    amountCommitted: number;
    organization: {
      id: string;
      legalName: string;
      bankAccountHolder: string | null;
      bankAccountNumber: string | null;
      dirigeantEstPep: boolean;
    };
  }) {
    const membership = await this.institutionsRepository.findMembershipByUserId(params.investorId);
    if (!membership) return;

    const institution = await this.institutionsRepository.findInstitutionById(membership.institutionId);
    const ticketMax = institution?.ticketMax ? Number(institution.ticketMax) : 0;
    const seuil = ticketMax > 0 ? ticketMax : SEUIL_TRANSACTION_INHABITUELLE_DEFAUT;

    const triggered: AmlAlertType[] = [];
    if (params.amountCommitted > seuil) triggered.push('TRANSACTION_INHABITUELLE');
    if (!params.organization.bankAccountHolder || !params.organization.bankAccountNumber) {
      triggered.push('BENEFICIAIRE_NON_IDENTIFIE');
    }
    if (params.organization.dirigeantEstPep) triggered.push('PEP_DETECTE');

    for (const alertType of triggered) {
      const existing = await this.institutionsRepository.findActiveAmlAlert(
        membership.institutionId,
        params.organization.id,
        alertType,
      );
      if (existing) continue;

      await this.institutionsRepository.createAmlAlert({
        institutionId: membership.institutionId,
        organizationId: params.organization.id,
        clientLabel: params.organization.legalName,
        alertType,
        amount: params.amountCommitted,
        status: 'EN_ANALYSE',
        detectedAt: new Date(),
      });

      // Email en plus de l'in-app : événement de conformité réglementaire — ne doit
      // pas dépendre du fait que l'officier conformité soit connecté au dashboard.
      const memberIds = await this.institutionsRepository.findMemberUserIds(membership.institutionId);
      await Promise.all(
        memberIds.map((userId) =>
          this.notificationsService.notify(
            userId,
            'Alerte AML/LAB-CFT détectée',
            `${AML_ALERT_LABELS[alertType]} — ${params.organization.legalName} (${params.amountCommitted.toLocaleString('fr-FR')} F CFA).`,
            `${FRONTEND_URL}/institution/risques`,
            { email: true, ctaLabel: "Voir l'alerte" },
          ),
        ),
      );
    }
  }

  // ── Admin (partenaires) ────────────────────────────────────────────────

  async getAllAdmin(filters?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return this.institutionsRepository.findAllAdmin(filters);
  }

  async getAdminStats() {
    return this.institutionsRepository.countAdminStats();
  }

  async getOneAdmin(id: string) {
    const institution = await this.institutionsRepository.findByIdAdmin(id);
    if (!institution) {
      throw new NotFoundException('Institution introuvable.');
    }
    return this.toProfileDto(institution);
  }
}
