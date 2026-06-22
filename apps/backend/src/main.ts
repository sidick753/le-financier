import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4200',
    credentials: true,
  });
  const port = process.env.PORT ?? 4201;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();