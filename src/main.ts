import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Prefix chung cho mọi route -> /api/...
  app.setGlobalPrefix('api');

  // Validate + transform mọi DTO dùng class-validator.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS cho frontend nourish-loop.
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    credentials: true,
  });

  // Render inject PORT; local mặc định 3000.
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🍃 Nourish-Loop API đang chạy tại http://localhost:${port}/api`);
}

void bootstrap();
