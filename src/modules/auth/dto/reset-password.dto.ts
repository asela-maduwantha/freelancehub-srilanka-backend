import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AUTH_CONSTANTS } from '../../../common/constants/auth.constants';

export class ResetPasswordDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString({ message: 'OTP must be a string' })
  @Length(AUTH_CONSTANTS.OTP_LENGTH, AUTH_CONSTANTS.OTP_LENGTH, {
    message: `OTP must be exactly ${AUTH_CONSTANTS.OTP_LENGTH} digits`,
  })
  @IsNotEmpty({ message: 'OTP is required' })
  otp: string;

  @ApiProperty({ example: 'NewSecurePassword123!' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(AUTH_CONSTANTS.PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} characters long`,
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  @IsNotEmpty({ message: 'New password is required' })
  newPassword: string;
}
