import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLoggerService } from '../logger/app-logger.service';
import { sanitizeLogData } from '../logger/sanitize-log-data';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLoggerService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, query, body } = req;
    const startedAt = process.hrtime.bigint();

    this.logger.log(
      {
        event: 'incoming_request',
        method,
        url: originalUrl,
        query: sanitizeLogData(query),
        body: sanitizeLogData(body),
      },
      'HTTP',
    );

    res.on('finish', () => {
      const { statusCode } = res;
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      this.logger.log(
        {
          event: 'outgoing_response',
          method,
          url: originalUrl,
          statusCode,
          responseTimeMs: Number(durationMs.toFixed(2)),
        },
        'HTTP',
      );
    });

    next();
  }
}
