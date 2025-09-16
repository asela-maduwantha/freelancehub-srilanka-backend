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
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const { method, url, ip, body } = request;
    const userAgent = request.get('User-Agent') || '';
    const userId = request.user?.id || 'anonymous';
    const isDevelopment = process.env.NODE_ENV !== 'production';

    const start = Date.now();

    // Log request details
    const requestLog = `${method} ${url} - ${ip} - ${userAgent} - User: ${userId}`;
    if (isDevelopment && body && Object.keys(body).length > 0) {
      this.logger.debug(`Request Body: ${JSON.stringify(body)}`);
    }
    this.logger.log(`Incoming: ${requestLog}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const { statusCode } = response;

          this.logger.log(
            `Outgoing: ${method} ${url} ${statusCode} ${duration}ms - ${ip} - ${userAgent} - User: ${userId}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - start;
          const statusCode = error?.status || 500;

          this.logger.error(
            `Error: ${method} ${url} ${statusCode} ${duration}ms - ${ip} - ${userAgent} - User: ${userId} - Error: ${error?.message}`,
          );
        },
      }),
    );
  }
}
