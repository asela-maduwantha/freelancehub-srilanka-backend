import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsIn,
  MinLength,
  Matches,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])?(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one lowercase letter, one number, and one special character. Uppercase is optional.',
  })
  password: string;

    @ApiProperty({
    description: 'User role(s)',
    example: ['freelancer'],
    type: [String],
    enum: ['freelancer', 'client'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsIn(['freelancer', 'client'], { each: true })
  role: string[];
}
