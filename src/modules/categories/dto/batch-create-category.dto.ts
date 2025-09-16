import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto';

export class BatchCreateCategoryDto {
  @ApiProperty({ type: [CreateCategoryDto], description: 'Array of categories to create' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCategoryDto)
  categories: CreateCategoryDto[];
}
