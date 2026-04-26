import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/app-logger.service';
import { sanitizeLogData } from '../logger/sanitize-log-data';
import { AppError } from '../errors/app-error';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode = this.getStatusCode(exception);
    const payload = this.getResponsePayload(exception, statusCode);

    const error = exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(
      {
        event: 'unhandled_exception',
        method: request.method,
        url: request.originalUrl,
        query: sanitizeLogData(request.query),
        body: sanitizeLogData(request.body),
        statusCode,
        errorName: error.name,
        message: error.message,
      },
      error.stack,
      'GlobalExceptionFilter',
    );

    response.status(statusCode);
    response.json(payload);
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof AppError) {
      return exception.statusCode;
    }

    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getResponsePayload(
    exception: unknown,
    statusCode: number,
  ): { statusCode: number; error: string; message: string | string[] } {
    if (exception instanceof AppError) {
      return {
        statusCode,
        error: this.getDefaultErrorName(statusCode),
        message: exception.message,
      };
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return {
          statusCode,
          error: this.getDefaultErrorName(statusCode),
          message: response,
        };
      }

      if (response && typeof response === 'object') {
        const typed = response as {
          message?: string | string[];
          error?: string;
        };

        return {
          statusCode,
          error: typed.error ?? this.getDefaultErrorName(statusCode),
          message:
            typed.message ??
            (statusCode === HttpStatus.INTERNAL_SERVER_ERROR
              ? 'An unexpected error occurred'
              : this.getDefaultErrorName(statusCode)),
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    };
  }

  private getDefaultErrorName(statusCode: number): string {
    return HttpStatus[statusCode] ?? 'Error';
  }
}
