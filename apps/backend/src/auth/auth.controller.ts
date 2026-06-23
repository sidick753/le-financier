import { Body, Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register/pme-owner')
  registerPmeOwner(@Body() dto: RegisterDto) {
    return this.authService.registerPmeOwner(dto);
  }

  @Post('register/investor')
  registerInvestor(@Body() dto: RegisterDto) {
    return this.authService.registerInvestor(dto);
  }

  @Post('register/institution')
  registerInstitution(@Body() dto: RegisterDto) {
    return this.authService.registerInstitution(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    return req.user; // injecté par JwtStrategy.validate()
  }
}
