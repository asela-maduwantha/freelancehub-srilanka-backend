import { HttpException, HttpStatus } from '@nestjs/common';

export class BadRequestException extends HttpException {
  constructor(message: string = 'Bad Request') {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'Bad Request',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string = 'Unauthorized') {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message,
        error: 'Unauthorized',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string = 'Forbidden') {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        error: 'Forbidden',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string = 'Not Found') {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message,
        error: 'Not Found',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ConflictException extends HttpException {
  constructor(message: string = 'Conflict') {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message,
        error: 'Conflict',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class InternalServerErrorException extends HttpException {
  constructor(message: string = 'Internal Server Error') {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
        error: 'Internal Server Error',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
