import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CacheTTL, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Category } from '../../database/schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  CategoryResponseDto,
  CategoriesListResponseDto,
} from './dto/category-response.dto';
import { BatchCreateCategoryDto } from './dto/batch-create-category.dto';
import { RESPONSE_MESSAGES } from '../../common/constants/response-messages';
import slugify from 'slugify';
import { MessageResponseDto } from 'src/common/dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    // Generate slug if not provided
    if (!createCategoryDto.slug) {
      createCategoryDto.slug = slugify(createCategoryDto.name, {
        lower: true,
        strict: true,
        trim: true,
      });
    }

    // Check for duplicate slug
    const existingCategory = await this.categoryModel
      .findOne({ slug: createCategoryDto.slug, deletedAt: { $exists: false } })
      .exec();
    if (existingCategory) {
      throw new BadRequestException('Category with this slug already exists');
    }

    const category = new this.categoryModel(createCategoryDto);
    const savedCategory = await category.save();

    // Clear cache after creating new category
    await this.cacheManager.del('main_categories');
    await this.cacheManager.del('category');

    return this.mapToCategoryResponseDto(savedCategory);
  }

  async batchCreate(
    batchCreateCategoryDto: BatchCreateCategoryDto,
  ): Promise<MessageResponseDto> {
    const createdCategories: any[] = [];
    const errors: { name: string; error: string }[] = [];

    for (const categoryDto of batchCreateCategoryDto.categories) {
      try {
        // Generate slug if not provided
        if (!categoryDto.slug) {
          categoryDto.slug = slugify(categoryDto.name, {
            lower: true,
            strict: true,
            trim: true,
          });
        }

        const category = new this.categoryModel(categoryDto);
        const savedCategory = await category.save();
        createdCategories.push(savedCategory);
      } catch (error: any) {
        errors.push({ name: categoryDto.name, error: error.message });
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: `Created ${createdCategories.length} categories, ${errors.length} failed`,
        errors,
      });
    }

    return {
      message: `Successfully created ${createdCategories.length} categories`,
    };
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    isActive?: boolean,
    parentId?: string,
    search?: string,
  ): Promise<CategoriesListResponseDto> {
    // Create cache key based on parameters
    const cacheKey = `categories:${page}:${limit}:${isActive}:${parentId}:${search}`;

    // Try to get from cache first
    const cachedResult = await this.cacheManager.get<CategoriesListResponseDto>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Build filter
    const filter: any = { deletedAt: { $exists: false } };
    if (isActive !== undefined) filter.isActive = isActive;
    if (parentId !== undefined) {
      if (parentId === 'null') {
        filter.parentId = { $exists: false };
      } else {
        filter.parentId = parentId;
      }
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [categories, total] = await Promise.all([
      this.categoryModel
        .find(filter)
        .sort({ order: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.categoryModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    const result = {
      categories: categories.map((category) =>
        this.mapToCategoryResponseDto(category),
      ),
      total,
      page,
      limit,
      totalPages,
    };

    // Cache the result for 10 minutes
    await this.cacheManager.set(cacheKey, result, 600000);

    return result;
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    const cacheKey = `category:${id}`;

    // Try to get from cache first
    const cachedResult = await this.cacheManager.get<CategoryResponseDto>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const category = await this.categoryModel.findById(id).exec();

    if (!category || category.deletedAt) {
      throw new NotFoundException(RESPONSE_MESSAGES.CATEGORY.NOT_FOUND);
    }

    const result = this.mapToCategoryResponseDto(category);

    // Cache the result for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  async findBySlug(slug: string): Promise<CategoryResponseDto> {
    const cacheKey = `category_slug:${slug}`;

    // Try to get from cache first
    const cachedResult = await this.cacheManager.get<CategoryResponseDto>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const category = await this.categoryModel
      .findOne({ slug, deletedAt: { $exists: false } })
      .exec();

    if (!category) {
      throw new NotFoundException(RESPONSE_MESSAGES.CATEGORY.NOT_FOUND);
    }

    const result = this.mapToCategoryResponseDto(category);

    // Cache the result for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  async findMainCategories(
    page: number = 1,
    limit: number = 10,
  ): Promise<CategoriesListResponseDto> {
    const cacheKey = `main_categories:${page}:${limit}`;

    // Try to get from cache first
    const cachedResult = await this.cacheManager.get<CategoriesListResponseDto>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const skip = (page - 1) * limit;

    const filter = {
      parentId: { $exists: false },
      isActive: true,
      deletedAt: { $exists: false },
    };

    const [categories, total] = await Promise.all([
      this.categoryModel
        .find(filter)
        .sort({ order: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.categoryModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    const result = {
      categories: categories.map((category) =>
        this.mapToCategoryResponseDto(category),
      ),
      total,
      page,
      limit,
      totalPages,
    };

    // Cache the result for 30 minutes (main categories change less frequently)
    await this.cacheManager.set(cacheKey, result, 1800000);

    return result;
  }

  async findSubcategories(parentId: string): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryModel
      .find({
        parentId,
        isActive: true,
        deletedAt: { $exists: false },
      })
      .sort({ order: 1, name: 1 })
      .exec();

    return categories.map((category) =>
      this.mapToCategoryResponseDto(category),
    );
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryModel.findById(id).exec();

    if (!category || category.deletedAt) {
      throw new NotFoundException(RESPONSE_MESSAGES.CATEGORY.NOT_FOUND);
    }

    // Check if slug is being updated and if it already exists
    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const existingCategory = await this.categoryModel
        .findOne({
          slug: updateCategoryDto.slug,
          deletedAt: { $exists: false },
          _id: { $ne: id },
        })
        .exec();

      if (existingCategory) {
        throw new BadRequestException('Category with this slug already exists');
      }
    }

    // Check if parent category exists (if being updated)
    if (
      updateCategoryDto.parentId &&
      updateCategoryDto.parentId !== category.parentId?.toString()
    ) {
      const parentCategory = await this.categoryModel
        .findById(updateCategoryDto.parentId)
        .exec();
      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }
    }

    // Update the category
    const updatedCategory = await this.categoryModel
      .findByIdAndUpdate(id, updateCategoryDto, { new: true })
      .exec();

    if (!updatedCategory) {
      throw new NotFoundException(RESPONSE_MESSAGES.CATEGORY.NOT_FOUND);
    }

    // Clear cache after updating category
    await this.cacheManager.del('main_categories');
    await this.cacheManager.del('category');
    await this.cacheManager.del(`category_${id}`);

    return this.mapToCategoryResponseDto(updatedCategory);
  }

  async remove(id: string): Promise<MessageResponseDto> {
    const category = await this.categoryModel.findById(id).exec();

    if (!category || category.deletedAt) {
      throw new NotFoundException(RESPONSE_MESSAGES.CATEGORY.NOT_FOUND);
    }

    // Check if category has subcategories
    const subcategoriesCount = await this.categoryModel
      .countDocuments({
        parentId: id,
        deletedAt: { $exists: false },
      })
      .exec();

    if (subcategoriesCount > 0) {
      throw new BadRequestException(
        'Cannot delete category with existing subcategories',
      );
    }

    await this.categoryModel
      .findByIdAndUpdate(id, { deletedAt: new Date() })
      .exec();

    // Clear cache after deleting category
    await this.cacheManager.del('main_categories');
    await this.cacheManager.del('category');
    await this.cacheManager.del(`category_${id}`);

    return { message: RESPONSE_MESSAGES.CATEGORY.DELETED };
  }

  // Increment job count for a category
  async incrementJobCount(id: string): Promise<void> {
    await this.categoryModel
      .findByIdAndUpdate(id, { $inc: { jobCount: 1 } })
      .exec();
  }

  // Decrement job count for a category
  async decrementJobCount(id: string): Promise<void> {
    await this.categoryModel
      .findByIdAndUpdate(id, { $inc: { jobCount: -1 } })
      .exec();
  }

  // Map category document to response DTO
  private mapToCategoryResponseDto(category: any): CategoryResponseDto {
    return {
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      isActive: category.isActive,
      parentId: category.parentId?.toString(),
      order: category.order,
      subcategories: Array.isArray(category.subcategories)
        ? [...category.subcategories]
        : [],
      jobCount: category.jobCount || 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      isSubcategory: !!category.parentId,
      hasSubcategories:
        category.subcategories && category.subcategories.length > 0,
      isDeleted: !!category.deletedAt,
    };
  }
}
