import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params, user } = request;
    const userAgent = request.get('User-Agent') || '';
    const ip = request.ip || request.connection.remoteAddress;

    const now = Date.now();

    this.logger.log(
      `Incoming Request: ${method} ${url}`,
      {
        method,
        url,
        userAgent,
        ip,
        userId: user?.userId || 'anonymous',
        body: this.sanitizeBody(body),
        query,
        params,
      },
    );

    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - now;
        this.logger.log(
          `Response: ${method} ${url} - ${responseTime}ms`,
          {
            method,
            url,
            responseTime,
            statusCode: context.switchToHttp().getResponse().statusCode,
          },
        );
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'otpCode', 'refreshToken', 'stripeSecretKey'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
