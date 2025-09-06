import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SavedProject, SavedProjectDocument } from '../../../schemas/saved-project.schema';
import { ProjectsService } from '../../projects/services/projects.service';
import {
  NotFoundException,
  ConflictException,
} from '../../../common/exceptions';

export interface SavedProjectsQuery {
  page: number;
  limit: number;
}

@Injectable()
export class SavedProjectsService {
  constructor(
    @InjectModel(SavedProject.name)
    private savedProjectModel: Model<SavedProjectDocument>,
    private readonly projectsService: ProjectsService,
  ) {}

  async saveProject(
    userId: string,
    projectId: string,
  ): Promise<{ message: string; savedProject: SavedProjectDocument }> {
    // Check if project exists
    await this.projectsService.getProjectById(projectId);

    // Check if already saved
    const existingSave = await this.savedProjectModel.findOne({
      userId,
      projectId,
    });

    if (existingSave) {
      throw new ConflictException('Project already saved');
    }

    const savedProject = new this.savedProjectModel({
      userId,
      projectId,
    });

    const result = await savedProject.save();

    return {
      message: 'Project saved successfully',
      savedProject: result,
    };
  }

  async getSavedProjects(userId: string, query: SavedProjectsQuery) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [savedProjects, total] = await Promise.all([
      this.savedProjectModel
        .find({ userId })
        .populate({
          path: 'projectId',
          select: 'title description budget status createdAt clientId',
        })
        .sort({ savedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.savedProjectModel.countDocuments({ userId }).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      savedProjects,
      total,
      page,
      totalPages,
    };
  }

  async checkIfSaved(
    userId: string,
    projectId: string,
  ): Promise<{ isSaved: boolean; savedProjectId?: string }> {
    const savedProject = await this.savedProjectModel.findOne({
      userId,
      projectId,
    });

    return {
      isSaved: !!savedProject,
      savedProjectId: savedProject?._id?.toString(),
    };
  }

  async unsaveProject(
    userId: string,
    projectId: string,
  ): Promise<{ message: string }> {
    const result = await this.savedProjectModel.findOneAndDelete({
      userId,
      projectId,
    });

    if (!result) {
      throw new NotFoundException('Saved project not found');
    }

    return { message: 'Project unsaved successfully' };
  }

  async getSavedProjectsCount(userId: string): Promise<{ count: number }> {
    const count = await this.savedProjectModel.countDocuments({ userId });
    return { count };
  }

  async getSavedProjectIds(userId: string): Promise<string[]> {
    const savedProjects = await this.savedProjectModel
      .find({ userId })
      .select('projectId')
      .exec();

    return savedProjects.map(sp => sp.projectId.toString());
  }

  async removeAllSavedProjectsForProject(projectId: string): Promise<void> {
    await this.savedProjectModel.deleteMany({ projectId });
  }
}
