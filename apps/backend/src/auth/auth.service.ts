import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersRepository } from '../users/users.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersRepository: UsersRepository,
    private jwtService: JwtService,
  ) {}

  async registerPmeOwner(dto: RegisterDto) {
    return this.register(dto, 'PME_OWNER');
  }

  async registerInvestor(dto: RegisterDto) {
    return this.register(dto, 'INVESTOR');
  }

  async registerInstitution(dto: RegisterDto) {
    return this.register(dto, 'INSTITUTION');
  }

  private async register(
    dto: RegisterDto,
    role: 'PME_OWNER' | 'INVESTOR' | 'INSTITUTION',
  ) {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.usersRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role,
      phone: dto.phone,
    });

    return this.buildAuthResponse(user);
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

  async getAllUsers(filters?: { role?: string }) {
    return this.usersRepository.findAll(filters);
  }

  async updateUserKyc(id: string, status: 'VERIFIED' | 'REJECTED') {
    return this.usersRepository.updateKycStatus(id, status);
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
