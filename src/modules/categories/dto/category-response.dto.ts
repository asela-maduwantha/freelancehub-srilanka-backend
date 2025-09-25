import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  icon?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  parentId?: string;

  @ApiProperty()
  order: number;

  @ApiProperty({ type: [String] })
  subcategories: string[];

  @ApiProperty()
  jobCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  isSubcategory: boolean;

  @ApiProperty()
  hasSubcategories: boolean;

  @ApiProperty()
  isDeleted: boolean;
}

export class CategoriesListResponseDto {
  @ApiProperty({ type: [CategoryResponseDto] })
  categories: CategoryResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}


