import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.NEXT_PUBLIC_APP_URL?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  // Validation is handled per-route via parseWith() with Zod schemas (see
  // common/pipes/zod-validation.pipe.ts). We deliberately do not register
  // Nest's ValidationPipe because it requires class-validator + class-transformer,
  // and our DTOs are Zod schemas living in @cinenova/shared.
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('CineNova API')
    .setDescription('Cinema booking platform API — auth, catalog, booking, payment, admin.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc, { swaggerOptions: { persistAuthorization: true } });

  // Order matters: platforms like Render inject PORT and expect us to bind there.
  // API_PORT is our local-dev default and gets a Zod default of 4000 — if listed
  // first it would override the platform-injected PORT after @nestjs/config writes
  // validated values back into process.env.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');

  app.get(Logger).log(`CineNova API ready at http://localhost:${port} (docs at /docs)`);
}

void bootstrap();
