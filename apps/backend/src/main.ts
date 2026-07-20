import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CORS_ORIGINS } from './common/cors-origins';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: CORS_ORIGINS,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });


  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // ── Swagger ────────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('LeFinancier API')
    .setDescription(
      `API REST de la plateforme LeFinancier — mise en relation PME / Investisseurs / Institutions financières.

## Authentification
La majorité des endpoints requiert un token JWT.
1. Appelez \`POST /auth/login\` (ou \`/auth/register/pme-owner\`) pour obtenir un \`accessToken\`.
2. Cliquez sur **Authorize** (🔒) et entrez \`Bearer <accessToken>\`.

## Workflow funding request
\`\`\`
PME crée        POST /funding-requests          → status: DRAFT
PME soumet      PATCH /funding-requests/:id/submit  → status: UNDER_REVIEW
Admin approuve  PATCH /funding-requests/:id/approve → status: PUBLISHED
Investisseur engage  POST /investments
Investisseur confirme PATCH /investments/:id/settle → status: SETTLED_OFF_PLATFORM
(auto) si 100% levé → fundingRequest.status: FUNDED
\`\`\``,
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'jwt',
    )
    .addTag('Auth', 'Inscription, connexion et profil utilisateur')
    .addTag('Organizations', 'Gestion des organisations (PME)')
    .addTag('Funding Requests', 'Demandes de financement')
    .addTag('Investments', 'Engagements des investisseurs')
    .addTag('Documents', 'Upload et gestion documentaire')
    .addTag('Notifications', 'Notifications in-app')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'LeFinancier — API Docs',
  });
  // ──────────────────────────────────────────────────────────────────────────

  const port = process.env.PORT ?? 4201;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
  console.log(`Swagger docs   → http://localhost:${port}/api/docs`);
}
bootstrap();
