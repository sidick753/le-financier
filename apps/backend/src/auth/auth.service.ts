import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersRepository } from '../users/users.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { InstitutionsRepository } from '../institutions/institutions.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService, renderEmail } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const FRONTEND_URL = process.env.FRONTEND_URL ?? '';

@Injectable()
export class AuthService {
  constructor(
    private usersRepository: UsersRepository,
    private organizationsRepository: OrganizationsRepository,
    private institutionsRepository: InstitutionsRepository,
    private notificationsService: NotificationsService,
    private mailService: MailService,
    private jwtService: JwtService,
  ) {}

  // Email de bienvenue — pas d'in-app ici : l'utilisateur vient de recevoir ses
  // tokens et n'a encore jamais vu la cloche de notifications, l'email est le
  // seul canal qui a du sens à cet instant précis.
  private async sendWelcomeEmail(email: string, firstName: string) {
    const title = 'Bienvenue sur LeFinancier';
    await this.mailService.send(
      email,
      title,
      renderEmail(
        title,
        `Bonjour ${firstName}, votre compte a bien été créé. Vous pouvez dès maintenant vous connecter et compléter votre dossier.`,
        { label: 'Se connecter', url: `${FRONTEND_URL}/login` },
      ),
    );
  }

  async registerPmeOwner(dto: RegisterDto) {
    await this.assertEmailAvailable(dto.email);

    const companyName = dto.companyName?.trim();
    const registrationNumber = dto.registrationNumber?.trim();
    if (!companyName || !registrationNumber) {
      throw new BadRequestException("Le nom de l'entreprise et le numéro RCCM sont requis.");
    }

    const existingOrg = await this.organizationsRepository.findByRegistrationNumber(registrationNumber);
    if (existingOrg) {
      throw new ConflictException('Une organisation existe déjà avec ce numéro RCCM.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const { user } = await this.organizationsRepository.registerOwner(
      { email: dto.email, passwordHash, firstName: dto.firstName, lastName: dto.lastName, phone: dto.phone },
      { legalName: companyName, registrationNumber, sector: 'Secteur non renseigné', country: 'CI' },
    );

    await this.sendWelcomeEmail(user.email, user.firstName);
    return this.buildAuthResponse(user);
  }

  async registerInvestor(dto: RegisterDto) {
    await this.assertEmailAvailable(dto.email);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: 'INVESTOR',
      phone: dto.phone,
      cniNumber: dto.cniNumber,
    });

    await this.sendWelcomeEmail(user.email, user.firstName);
    return this.buildAuthResponse(user);
  }

  async registerInstitution(dto: RegisterDto) {
    await this.assertEmailAvailable(dto.email);

    const institutionName = dto.institutionName?.trim();
    const bceaoNumber = dto.bceaoNumber?.trim();
    if (!institutionName || !bceaoNumber) {
      throw new BadRequestException("Le nom de l'institution et le numéro d'agrément BCEAO sont requis.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const { user } = await this.institutionsRepository.registerOwner(
      { email: dto.email, passwordHash, firstName: dto.firstName, lastName: dto.lastName, phone: dto.phone },
      { name: institutionName, bceaoApprovalNumber: bceaoNumber, country: 'CI' },
    );

    await this.sendWelcomeEmail(user.email, user.firstName);
    return this.buildAuthResponse(user);
  }

  private async assertEmailAvailable(email: string) {
    const existing = await this.usersRepository.findByEmail(email);
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string) {
    const stored = await this.usersRepository.findRefreshToken(refreshToken);

    if (!stored || stored.revoked || new Date() > stored.expiresAt) {
      // Détection de réutilisation : révoque tous les tokens de l'utilisateur
      if (stored?.userId) {
        await this.usersRepository.revokeAllUserRefreshTokens(stored.userId);
      }
      throw new UnauthorizedException('Session expirée. Veuillez vous reconnecter.');
    }

    // Rotation : révoque l'ancien avant d'en émettre un nouveau
    await this.usersRepository.revokeRefreshToken(refreshToken);

    const user = await this.usersRepository.findById(stored.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Compte inactif ou supprimé.');
    }

    return this.buildAuthResponse(user);
  }

  async logout(refreshToken: string) {
    await this.usersRepository.revokeRefreshToken(refreshToken).catch(() => {});
    return { message: 'Déconnexion réussie.' };
  }

  async getMyProfile(userId: string) {
    const user = await this.usersRepository.findByIdPublic(userId);
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable.');
    }
    return user;
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    return this.usersRepository.updateProfile(userId, dto);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable.');
    }

    const currentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentValid) {
      throw new UnauthorizedException('Mot de passe actuel incorrect.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.usersRepository.updatePassword(userId, passwordHash);

    // Un changement de mot de passe invalide toutes les sessions existantes.
    await this.usersRepository.revokeAllUserRefreshTokens(userId);

    // Alerte de sécurité — email seul (pas d'in-app : si le mot de passe a été
    // changé par un tiers malveillant, la victime doit être prévenue même sans
    // se reconnecter). Pas de lien : évite qu'un email de sécurité ressemble à
    // une tentative de phishing.
    const title = 'Mot de passe modifié';
    await this.mailService.send(
      user.email,
      title,
      renderEmail(
        title,
        "Le mot de passe de votre compte LeFinancier vient d'être modifié. Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement le support.",
      ),
    );

    return { message: 'Mot de passe mis à jour.' };
  }

  async getAllUsers(filters?: {
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return this.usersRepository.findAll(filters);
  }

  async getInvestorStats() {
    return this.usersRepository.getInvestorStats();
  }

  async getUserAdminDetail(id: string) {
    const user = await this.usersRepository.findByIdAdmin(id);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }
    return user;
  }

  async updateUserKyc(id: string, status: 'VERIFIED' | 'REJECTED', reason?: string) {
    const updated = await this.usersRepository.updateKycStatus(id, status, reason);

    await this.notificationsService.notify(
      id,
      status === 'VERIFIED' ? 'Identité vérifiée' : 'Vérification d\'identité rejetée',
      status === 'VERIFIED'
        ? 'Votre pièce d\'identité a été validée.'
        : `Votre pièce d'identité a été rejetée. Motif : ${reason}. Veuillez la resoumettre.`,
      undefined,
      { email: true },
    );

    return updated;
  }

  private async buildAuthResponse(user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    const rawRefreshToken = randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.usersRepository.createRefreshToken(user.id, rawRefreshToken, expiresAt);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 15 * 60,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }
}
