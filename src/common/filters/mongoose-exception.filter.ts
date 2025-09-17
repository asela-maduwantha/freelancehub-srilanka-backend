import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { MongoError } from 'mongodb';

@Catch(MongoError)
export class MongooseExceptionFilter implements ExceptionFilter {
  catch(exception: MongoError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error occurred';

    switch (exception.code) {
      case 11000:
        status = HttpStatus.CONFLICT;
        message = 'Duplicate key error';
        break;
      case 121:
        status = HttpStatus.BAD_REQUEST;
        message = 'Document validation failed';
        break;
      default:
        if (exception.name === 'CastError') {
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid data format';
        } else if (exception.name === 'ValidationError') {
          status = HttpStatus.BAD_REQUEST;
          message = 'Data validation failed';
        }
        break;
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: exception.name,
      timestamp: new Date().toISOString(),
    });
  }
}
