import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class StripPasswordInterceptor implements NestInterceptor {
  private stripPassword(data: unknown): unknown {
    if (Array.isArray(data)) {
      return data.map((item) => this.stripPassword(item));
    }

    if (data && typeof data === 'object') {
      const clone = { ...(data as Record<string, unknown>) };
      delete clone.password;

      for (const key of Object.keys(clone)) {
        clone[key] = this.stripPassword(clone[key]);
      }

      return clone;
    }

    return data;
  }

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((value) => this.stripPassword(value)));
  }
}
