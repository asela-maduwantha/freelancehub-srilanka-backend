import { ApiProperty } from '@nestjs/swagger';

export class StandardResponseDto<T = any> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data?: T;

  @ApiProperty()
  message?: string;

  @ApiProperty()
  errorCode?: string;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  statusCode?: number;

  constructor(data?: T, message?: string, statusCode?: number) {
    this.success = true;
    this.data = data;
    this.message = message;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data?: T, message?: string, statusCode?: number): StandardResponseDto<T> {
    return new StandardResponseDto(data, message, statusCode);
  }

  static error(message: string, errorCode?: string, statusCode?: number): StandardResponseDto<null> {
    const response = new StandardResponseDto<null>();
    response.success = false;
    response.message = message;
    response.errorCode = errorCode;
    response.statusCode = statusCode;
    return response;
  }
}

export class PaginatedResponseDto<T> extends StandardResponseDto<T[]> {
  @ApiProperty()
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  constructor(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string
  ) {
    super(data, message);
    const totalPages = Math.ceil(total / limit);
    this.pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}

export class ErrorResponseDto {
  @ApiProperty()
  success: boolean = false;

  @ApiProperty()
  message: string;

  @ApiProperty()
  errorCode?: string;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  path?: string;

  @ApiProperty()
  method?: string;

  @ApiProperty()
  errors?: any[];

  constructor(
    message: string,
    statusCode: number,
    errorCode?: string,
    path?: string,
    method?: string,
    errors?: any[]
  ) {
    this.message = message;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.path = path;
    this.method = method;
    this.errors = errors;
    this.timestamp = new Date().toISOString();
  }
}