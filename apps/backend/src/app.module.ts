import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { FundingModule } from './funding/funding.module';
import { InvestmentsModule } from './investments/investments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DocumentsModule } from './documents/documents.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { RepaymentModule } from './repayment/repayment.module';
import { ScoringModule } from './scoring/scoring.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    AuthModule,
    OrganizationsModule,
    FundingModule,
    InvestmentsModule,
    NotificationsModule,
    DocumentsModule,
    WatchlistModule,
    RepaymentModule,
    ScoringModule,
    InstitutionsModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
