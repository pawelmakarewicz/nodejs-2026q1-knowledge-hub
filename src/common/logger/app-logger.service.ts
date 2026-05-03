import { ConsoleLogger, Injectable, LoggerService } from '@nestjs/common';
import {
  AppLogLevel,
  resolveLogLevel,
  shouldLog,
} from './log-level.util';
import { FileLogWriterService } from './file-log-writer.service';
import { sanitizeLogData } from './sanitize-log-data';

type LogPayload = string | Record<string, unknown> | unknown[];

@Injectable()
export class AppLoggerService extends ConsoleLogger implements LoggerService {
  private readonly configuredLevel: AppLogLevel;
  private readonly isProduction: boolean;

  constructor(private readonly fileWriter: FileLogWriterService) {
    super();
    this.configuredLevel = resolveLogLevel();
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  override log(message: LogPayload, context?: string): void {
    this.write('log', message, context);
  }

  override error(message: LogPayload, stack?: string, context?: string): void {
    this.write('error', message, context, stack);
  }

  override warn(message: LogPayload, context?: string): void {
    this.write('warn', message, context);
  }

  override debug(message: LogPayload, context?: string): void {
    this.write('debug', message, context);
  }

  override verbose(message: LogPayload, context?: string): void {
    this.write('verbose', message, context);
  }

  private write(
    level: AppLogLevel,
    message: LogPayload,
    context?: string,
    stack?: string,
  ): void {
    if (!shouldLog(level, this.configuredLevel)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const normalizedMessage = this.normalizeMessage(message);
    const formatted = this.isProduction
      ? this.formatStructured(level, normalizedMessage, context, timestamp, stack)
      : this.formatReadable(level, normalizedMessage, context, timestamp, stack);

    if (level === 'error') {
      super.error(formatted, stack, context);
    } else {
      super[level](formatted, context);
    }

    void this.fileWriter.write(`${formatted}\n`);
  }

  private normalizeMessage(message: LogPayload): string | Record<string, unknown> | unknown[] {
    if (typeof message === 'string') {
      return message;
    }

    return sanitizeLogData(message);
  }

  private formatReadable(
    level: AppLogLevel,
    message: string | Record<string, unknown> | unknown[],
    context: string | undefined,
    timestamp: string,
    stack?: string,
  ): string {
    const contextPart = context ? ` [${context}]` : '';
    const normalizedMessage =
      typeof message === 'string' ? message : JSON.stringify(message);
    const stackPart = stack ? `\n${stack}` : '';

    return `${timestamp} ${level.toUpperCase()}${contextPart} ${normalizedMessage}${stackPart}`;
  }

  private formatStructured(
    level: AppLogLevel,
    message: string | Record<string, unknown> | unknown[],
    context: string | undefined,
    timestamp: string,
    stack?: string,
  ): string {
    const payload: Record<string, unknown> = {
      timestamp,
      level,
      context: context ?? 'Application',
      message,
    };

    if (stack) {
      payload.stack = stack;
    }

    return JSON.stringify(payload);
  }
}
