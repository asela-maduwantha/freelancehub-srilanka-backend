import { IsOptional, IsString, IsArray, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePortfolioItemDto {
  @ApiPropertyOptional({
    description: 'Title of the portfolio item',
    example: 'Updated E-commerce Website',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Description of the portfolio item',
    example:
      'An updated full-stack e-commerce website built with React and Node.js',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Array of image URLs for the portfolio item',
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
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
