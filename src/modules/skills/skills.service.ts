import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Skill } from '../../database/schemas/skill.schema';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { BatchCreateSkillDto } from './dto/batch-create-skill.dto';
import {
  SkillResponseDto,
  SkillsListResponseDto,
  MessageResponseDto,
} from './dto/skill-response.dto';
import { RESPONSE_MESSAGES } from '../../common/constants/response-messages';
import slugify from 'slugify';

@Injectable()
export class SkillsService {
  constructor(
    @InjectModel(Skill.name) private readonly skillModel: Model<Skill>,
  ) {}


async create(createSkillDto: CreateSkillDto): Promise<SkillResponseDto> {
  if (!createSkillDto.slug) {
    createSkillDto.slug = slugify(createSkillDto.name, { lower: true, strict: true });
  }

  const skill = new this.skillModel(createSkillDto);
  const savedSkill = await skill.save();
  return this.mapToSkillResponseDto(savedSkill);
}

async batchCreate(batchCreateSkillDto: BatchCreateSkillDto): Promise<MessageResponseDto> {
  try {
    const skills = batchCreateSkillDto.skills.map(skillData => {
      const slug = skillData.slug || slugify(skillData.name, { lower: true, strict: true });
      return new this.skillModel({ ...skillData, slug });
    });

    await Promise.all(skills.map(skill => skill.save()));

    return { message: `${skills.length} skills created successfully` };
  } catch (error) {
    if (error.code === 11000) {
      throw new BadRequestException('Some skills already exist with duplicate slugs');
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

    return {
      skills: skills.map((skill) => this.mapToSkillResponseDto(skill)),
      total,
      page,
      limit,
      totalPages,
    };
  }


  async findOne(id: string): Promise<SkillResponseDto> {
    const skill = await this.skillModel.findById(id).exec();

    if (!skill) {
      throw new NotFoundException(RESPONSE_MESSAGES.SKILL.NOT_FOUND);
    }

    if (skill.deletedAt) {
      throw new NotFoundException(RESPONSE_MESSAGES.SKILL.NOT_FOUND);
    }

    return this.mapToSkillResponseDto(skill);
  }


  async findBySlug(slug: string): Promise<SkillResponseDto> {
    const skill = await this.skillModel.findOne({ slug, deletedAt: { $exists: false } }).exec();

    if (!skill) {
      throw new NotFoundException(RESPONSE_MESSAGES.SKILL.NOT_FOUND);
    }

    return this.mapToSkillResponseDto(skill);
  }


  async update(id: string, updateSkillDto: UpdateSkillDto): Promise<SkillResponseDto> {
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
      .findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
      .exec();

    if (!updatedSkill) {
      throw new NotFoundException(RESPONSE_MESSAGES.SKILL.NOT_FOUND);
    }

    return this.mapToSkillResponseDto(updatedSkill);
  }


  async remove(id: string): Promise<MessageResponseDto> {
    const skill = await this.skillModel.findById(id).exec();

    if (!skill) {
      throw new NotFoundException(RESPONSE_MESSAGES.SKILL.NOT_FOUND);
    }

    // Soft delete by setting deletedAt
    await this.skillModel.findByIdAndUpdate(id, { deletedAt: new Date() }).exec();

    return { message: RESPONSE_MESSAGES.SKILL.DELETED };
  }


  async findByCategory(category: string, page: number = 1, limit: number = 10): Promise<SkillsListResponseDto> {
    return this.findAll(page, limit, category);
  }


  async findPopular(limit: number = 20): Promise<SkillResponseDto[]> {
    const skills = await this.skillModel
      .find({ deletedAt: { $exists: false }, isActive: true })
      .sort({ usageCount: -1 })
      .limit(limit)
      .exec();

    return skills.map((skill) => this.mapToSkillResponseDto(skill));
  }

  // Search skills with text search
  async searchSkills(query: string, limit: number = 10): Promise<SkillResponseDto[]> {
    const skills = await this.skillModel
      .find({
        $text: { $search: query },
        deletedAt: { $exists: false },
        isActive: true
      })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .exec();

    return skills.map((skill) => this.mapToSkillResponseDto(skill));
  }

  // Increment usage count for a skill
  async incrementUsageCount(id: string): Promise<void> {
    await this.skillModel.findByIdAndUpdate(id, { $inc: { usageCount: 1 } }).exec();
  }

  // Map skill document to response DTO
  private mapToSkillResponseDto(skill: any): SkillResponseDto {
    return {
      id: skill._id.toString(),
      name: skill.name,
      slug: skill.slug,
      description: skill.description,
      synonyms: Array.isArray(skill.synonyms) ? [...skill.synonyms] : [],
      relatedSkills: Array.isArray(skill.relatedSkills) ? [...skill.relatedSkills] : [],
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
