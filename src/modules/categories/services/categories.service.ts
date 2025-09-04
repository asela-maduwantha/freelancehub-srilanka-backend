import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '../../../schemas';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto';
import { PaginationQueryDto } from '../../../dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryDocument> {
    const existingCategory = await this.categoryModel.findOne({ 
      name: new RegExp(`^${createCategoryDto.name}$`, 'i') 
    });

    if (existingCategory) {
      throw new ConflictException('Category with this name already exists');
    }

    const category = new this.categoryModel(createCategoryDto);
    return category.save();
  }

  async findAll(query: PaginationQueryDto): Promise<{
    data: CategoryDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, sortBy = 'sortOrder', sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;

    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.categoryModel
        .find({ isActive: true })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.categoryModel.countDocuments({ isActive: true }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryDocument> {
    if (updateCategoryDto.name) {
      const existingCategory = await this.categoryModel.findOne({
        name: new RegExp(`^${updateCategoryDto.name}$`, 'i'),
        _id: { $ne: id },
      });

      if (existingCategory) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    const category = await this.categoryModel.findByIdAndUpdate(
      id,
      updateCategoryDto,
      { new: true, runValidators: true },
    );

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async remove(id: string): Promise<void> {
    const category = await this.categoryModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }

  async getPopularCategories(limit: number = 10): Promise<CategoryDocument[]> {
    return this.categoryModel
      .find({ isActive: true })
      .sort({ sortOrder: 1 })
      .limit(limit)
      .exec();
  }
}
