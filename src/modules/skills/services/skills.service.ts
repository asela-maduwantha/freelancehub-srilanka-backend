import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Skill, SkillDocument } from '../../../schemas/skill.schema';
import { CreateSkillDto } from '../dto/create-skill.dto';
import { UpdateSkillDto } from '../dto/update-skill.dto';
import {
  NotFoundException,
  ConflictException,
} from '../../../common/exceptions';

export interface SkillsQuery {
  page: number;
  limit: number;
  category?: string;
  search?: string;
}

@Injectable()
export class SkillsService {
  constructor(
    @InjectModel(Skill.name) private skillModel: Model<SkillDocument>,
  ) {}

  async getAllSkills(query: SkillsQuery) {
    const { page, limit, category, search } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};
    if (category) {
      filter.category = category;
    }
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const [skills, total] = await Promise.all([
      this.skillModel
        .find(filter)
        .sort({ popularity: -1, name: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.skillModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      skills,
      total,
      page,
      totalPages,
    };
  }

  async getSkillById(id: string): Promise<SkillDocument> {
    const skill = await this.skillModel.findById(id).exec();
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }
    return skill;
  }

  async createSkill(createSkillDto: CreateSkillDto): Promise<SkillDocument> {
    const { name } = createSkillDto;

    // Check if skill already exists
    const existingSkill = await this.skillModel.findOne({ name }).exec();
    if (existingSkill) {
      throw new ConflictException('Skill already exists');
    }

    const skill = new this.skillModel(createSkillDto);
    return skill.save();
  }

  async updateSkill(
    id: string,
    updateSkillDto: UpdateSkillDto,
  ): Promise<SkillDocument> {
    const skill = await this.skillModel
      .findByIdAndUpdate(id, updateSkillDto, { new: true })
      .exec();

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    return skill;
  }

  async deleteSkill(id: string): Promise<{ message: string }> {
    const skill = await this.skillModel.findByIdAndDelete(id).exec();

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    return { message: 'Skill deleted successfully' };
  }

  async getCategories() {
    const categories = await this.skillModel.aggregate([
      {
        $group: {
          _id: '$category',
          skillCount: { $sum: 1 },
          skills: { $push: '$name' },
        },
      },
      {
        $project: {
          id: '$_id',
          name: '$_id',
          skillCount: 1,
          skills: { $slice: ['$skills', 5] }, // Show first 5 skills as example
        },
      },
      {
        $sort: { skillCount: -1 },
      },
    ]);

    return categories;
  }

  async getPopularSkills(limit: number = 10) {
    return this.skillModel
      .find()
      .sort({ popularity: -1 })
      .limit(limit)
      .select('id name category popularity')
      .exec();
  }

  async incrementPopularity(skillId: string): Promise<void> {
    await this.skillModel
      .findByIdAndUpdate(skillId, { $inc: { popularity: 1 } })
      .exec();
  }

  async searchSkills(searchTerm: string, limit: number = 20) {
    return this.skillModel
      .find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
        ],
      })
      .limit(limit)
      .sort({ popularity: -1 })
      .exec();
  }
}
