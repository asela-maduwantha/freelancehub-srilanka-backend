import {
  Injectable,
  ValidationPipe,
  BadRequestException,
  ValidationError,
} from '@nestjs/common';

@Injectable()
export class CustomValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
      exceptionFactory: (errors: ValidationError[]) => {
        const formattedErrors = this.formatValidationErrors(errors);
        return new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: formattedErrors,
        });
      },
    });
  }

  private formatValidationErrors(errors: ValidationError[]): any {
    const formattedErrors: any = {};

    errors.forEach(error => {
      const field = error.property;
      const constraints = error.constraints;

      if (constraints) {
        formattedErrors[field] = Object.values(constraints);
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        formattedErrors[field] = this.formatValidationErrors(error.children);
      }
    });

    return formattedErrors;
  }
}
