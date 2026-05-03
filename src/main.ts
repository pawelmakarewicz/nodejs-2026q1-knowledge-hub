import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';
import { AppLoggerService } from './common/logger/app-logger.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

function setupProcessErrorHandlers(
  app: INestApplication,
  logger: AppLoggerService,
): void {
  let isShuttingDown = false;

  const shutdown = async (reason: string, error?: unknown): Promise<void> => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    const normalizedError =
      error instanceof Error ? error : new Error(error ? String(error) : reason);
    logger.error(
      {
        event: 'process_shutdown',
        reason,
        message: normalizedError.message,
      },
      normalizedError.stack,
      'Process',
    );

    try {
      await app.close();
    } finally {
      process.exit(1);
    }
  };

  process.on('uncaughtException', (error) => {
    void shutdown('uncaughtException', error);
  });

  process.on('unhandledRejection', (reason) => {
    void shutdown('unhandledRejection', reason);
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const appLogger = app.get(AppLoggerService);

  app.useLogger(appLogger);
  app.useGlobalFilters(new GlobalExceptionFilter(appLogger));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Knowledge Hub')
    .setDescription('Knowledge Hub API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  setupProcessErrorHandlers(app, appLogger);
}
bootstrap();
