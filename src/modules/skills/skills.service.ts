import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CacheTTL, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Skill } from '../../database/schemas/skill.schema';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { BatchCreateSkillDto } from './dto/batch-create-skill.dto';
import {
  SkillResponseDto,
  SkillsListResponseDto,
} from './dto/skill-response.dto';
import { RESPONSE_MESSAGES } from '../../common/constants/response-messages';
import slugify from 'slugify';
import { MessageResponseDto } from 'src/common/dto';

@Injectable()
export class SkillsService {
  constructor(
    @InjectModel(Skill.name) private readonly skillModel: Model<Skill>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Invalidate all skill-related caches
   */
  private async invalidateSkillCaches(skillId: string): Promise<void> {
    try {
      // Clear the specific skill cache - FIX: use correct cache key format
      await this.cacheManager.del(`skill:${skillId}`);
      
      // Clear skill by slug cache (we don't know the slug, but it will expire naturally)
      
      // Clear skills list caches (first few pages)
      for (let page = 1; page <= 5; page++) {
        for (const limit of [10, 20, 50]) {
          await this.cacheManager.del(`skills:${page}:${limit}`);
          // Also clear with active filter
          await this.cacheManager.del(`skills:${page}:${limit}:active:true`);
          await this.cacheManager.del(`skills:${page}:${limit}:active:false`);
        }
      }
      
      // Clear popular skills cache
      await this.cacheManager.del('popular_skills');
      await this.cacheManager.del('skills:popular');
      
      // Clear any other skill-related caches
      await this.cacheManager.del('all_skills');
    } catch (error) {
      console.error(`Failed to invalidate skill caches for skill ${skillId}:`, error);
      // Don't throw - cache invalidation failures shouldn't break the operation
    }
  }

  async create(createSkillDto: CreateSkillDto): Promise<SkillResponseDto> {
    if (!createSkillDto.slug) {
      createSkillDto.slug = slugify(createSkillDto.name, {
        lower: true,
        strict: true,
      });
    }

    const skill = new this.skillModel(createSkillDto);
    const savedSkill = await skill.save();

    // Clear cache after creating new skill
    await this.cacheManager.del('skills');
    await this.cacheManager.del('popular_skills');

    return this.mapToSkillResponseDto(savedSkill);
  }

  async batchCreate(
    batchCreateSkillDto: BatchCreateSkillDto,
  ): Promise<MessageResponseDto> {
    try {
      const skills = batchCreateSkillDto.skills.map((skillData) => {
        const slug =
          skillData.slug ||
          slugify(skillData.name, { lower: true, strict: true });
        return new this.skillModel({ ...skillData, slug });
      });

      await Promise.all(skills.map((skill) => skill.save()));

      // Clear cache after batch creating skills
      await this.cacheManager.del('skills');
      await this.cacheManager.del('popular_skills');

      return { message: `${skills.length} skills created successfully` };
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException(
          'Some skills already exist with duplicate slugs',
        );
      }
      throw error;
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    category?: string,
    difficulty?: string,
    search?: string,
    isActive?: boolean,
  ): Promise<SkillsListResponseDto> {
    // Create cache key based on parameters
    const cacheKey = `skills:${page}:${limit}:${category}:${difficulty}:${search}:${isActive}`;

    // Try to get from cache first
    const cachedResult = await this.cacheManager.get<SkillsListResponseDto>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const skip = (page - 1) * limit;

    const filter: any = {};
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (isActive !== undefined) filter.isActive = isActive;
    filter.deletedAt = { $exists: false };

    if (search) {
      filter.$text = { $search: search };
    }

    const [skills, total] = await Promise.all([
      this.skillModel
        .find(filter)
        .sort({ usageCount: -1, demandScore: -1, name: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.skillModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    const result = {
      skills: skills.map((skill) => this.mapToSkillResponseDto(skill)),
      total,
      page,
      limit,
      totalPages,
    };

    // Cache the result for 10 minutes
    await this.cacheManager.set(cacheKey, result, 600000);

    return result;
  }

  async findOne(id: string): Promise<SkillResponseDto> {
    const cacheKey = `skill:${id}`;

    // Try to get from cache first
    const cachedResult = await this.cacheManager.get<SkillResponseDto>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const skill = await this.skillModel.findById(id).exec();

    if (!skill) {
      throw new NotFoundException(RESPONSE_MESSAGES.SKILL.NOT_FOUND);
    }

    if (skill.deletedAt) {
      throw new NotFoundException(RESPONSE_MESSAGES.SKILL.NOT_FOUND);
    }

    const result = this.mapToSkillResponseDto(skill);

    // Cache the result for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  async findBySlug(slug: string): Promise<SkillResponseDto> {
    const cacheKey = `skill_slug:${slug}`;

    // Try to get from cache first
    const cachedResult = await this.cacheManager.get<SkillResponseDto>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const skill = await this.skillModel
      .findOne({ slug, deletedAt: { $exists: false } })
      .exec();

    if (!skill) {
      throw new NotFoundException(RESPONSE_MESSAGES.SKILL.NOT_FOUND);
    }

    const result = this.mapToSkillResponseDto(skill);

    // Cache the result for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  async update(
    id: string,
    updateSkillDto: UpdateSkillDto,
  ): Promise<SkillResponseDto> {
    const skill = await this.skillModel.findById(id).exec();

    if (!skill) {
      throw new NotFoundException(RESPONSE_MESSAGES.SKILL.NOT_FOUND);
    }

    const updateData: any = {};

    const addIfDefined = (key: string, value: any) => {
      if (value !== undefined) {
        updateData[key] = value;
      }
    };

    addIfDefined('name', updateSkillDto.name);
    addIfDefined('slug', updateSkillDto.slug);
    addIfDefined('description', updateSkillDto.description);
    addIfDefined('synonyms', updateSkillDto.synonyms);
    addIfDefined('relatedSkills', updateSkillDto.relatedSkills);
    addIfDefined('category', updateSkillDto.category);
    addIfDefined('difficulty', updateSkillDto.difficulty);
    addIfDefined('isActive', updateSkillDto.isActive);
    addIfDefined('usageCount', updateSkillDto.usageCount);
    addIfDefined('demandScore', updateSkillDto.demandScore);
    addIfDefined('icon', updateSkillDto.icon);
    addIfDefined('color', updateSkillDto.color);

    const updatedSkill = await this.skillModel
      .findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updatedSkill) {
      throw new NotFoundException(RESPONSE_MESSAGES.SKILL.NOT_FOUND);
    }

    // Clear cache after updating skill - FIX: use correct cache key format
    await this.invalidateSkillCaches(id);

    return this.mapToSkillResponseDto(updatedSkill);
  }

  async remove(id: string): Promise<MessageResponseDto> {
    const skill = await this.skillModel.findById(id).exec();

    if (!skill) {
      throw new NotFoundException(RESPONSE_MESSAGES.SKILL.NOT_FOUND);
    }

    // Soft delete by setting deletedAt
    await this.skillModel
      .findByIdAndUpdate(id, { deletedAt: new Date() })
      .exec();

    // Clear cache after removing skill
    await this.invalidateSkillCaches(id);

    return { message: RESPONSE_MESSAGES.SKILL.DELETED };
  }

  async findByCategory(
    category: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<SkillsListResponseDto> {
    return this.findAll(page, limit, category);
  }

  async findPopular(limit: number = 20): Promise<SkillResponseDto[]> {
    const cacheKey = `popular_skills:${limit}`;

    // Try to get from cache first
    const cachedResult = await this.cacheManager.get<SkillResponseDto[]>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const skills = await this.skillModel
      .find({ deletedAt: { $exists: false }, isActive: true })
      .sort({ usageCount: -1 })
      .limit(limit)
      .exec();

    const result = skills.map((skill) => this.mapToSkillResponseDto(skill));

    // Cache the result for 15 minutes (popular skills change moderately)
    await this.cacheManager.set(cacheKey, result, 900000);

    return result;
  }

  // Search skills with text search
  async searchSkills(
    query: string,
    limit: number = 10,
  ): Promise<SkillResponseDto[]> {
    const cacheKey = `search_skills:${query}:${limit}`;

    // Try to get from cache first
    const cachedResult = await this.cacheManager.get<SkillResponseDto[]>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const skills = await this.skillModel
      .find({
        $text: { $search: query },
        deletedAt: { $exists: false },
        isActive: true,
      })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .exec();

    const result = skills.map((skill) => this.mapToSkillResponseDto(skill));

    // Cache the result for 5 minutes (search results can be cached briefly)
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  // Increment usage count for a skill
  async incrementUsageCount(id: string): Promise<void> {
    await this.skillModel
      .findByIdAndUpdate(id, { $inc: { usageCount: 1 } })
      .exec();
  }

  // Map skill document to response DTO
  private mapToSkillResponseDto(skill: any): SkillResponseDto {
    return {
      id: skill._id.toString(),
      name: skill.name,
      slug: skill.slug,
      description: skill.description,
      synonyms: Array.isArray(skill.synonyms) ? [...skill.synonyms] : [],
      relatedSkills: Array.isArray(skill.relatedSkills)
        ? [...skill.relatedSkills]
        : [],
      category: skill.category,
      difficulty: skill.difficulty,
      isActive: skill.isActive,
      usageCount: skill.usageCount,
      demandScore: skill.demandScore,
      icon: skill.icon,
      color: skill.color,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
      isDeleted: skill.isDeleted,
      hasSynonyms: skill.hasSynonyms,
      hasRelatedSkills: skill.hasRelatedSkills,
    };
  }
}
