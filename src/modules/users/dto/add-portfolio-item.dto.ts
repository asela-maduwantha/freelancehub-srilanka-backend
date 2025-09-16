import { IsNotEmpty, IsString, IsOptional, IsArray, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddPortfolioItemDto {
  @ApiProperty({
    description: 'Title of the portfolio item',
    example: 'E-commerce Website',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Description of the portfolio item',
    example: 'A full-stack e-commerce website built with React and Node.js',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Array of image URLs for the portfolio item',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    description: 'URL to the live project or demo',
    example: 'https://myproject.com',
  })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({
    description: 'Array of technologies used in the project',
    example: ['React', 'Node.js', 'MongoDB', 'Express'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];
}
