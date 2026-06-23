import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
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

  private buildAuthResponse(user: { id: string; email: string; role: string; firstName: string; lastName: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
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
