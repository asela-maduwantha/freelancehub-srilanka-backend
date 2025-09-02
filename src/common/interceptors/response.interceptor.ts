import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  message?: string;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already wrapped in our format, return as is
        if (data && typeof data === 'object' && 'data' in data && 'timestamp' in data) {
          return data;
        }

        // Handle pagination responses
        if (data && typeof data === 'object' && ('total' in data || 'page' in data)) {
          const { data: items, total, page, limit, ...rest } = data as any;
          
          if (items !== undefined) {
            return {
              data: items,
              meta: {
                total,
                page,
                limit,
                hasNext: page && limit ? page * limit < total : false,
                hasPrev: page ? page > 1 : false,
              },
              timestamp: new Date().toISOString(),
              ...rest,
            };
          }
        }

        // Standard response wrapping
        return {
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
