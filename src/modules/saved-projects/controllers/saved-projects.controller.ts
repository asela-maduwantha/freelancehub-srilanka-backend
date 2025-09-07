import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SavedProjectsService } from '../services/saved-projects.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RateLimit } from '../../../common/guards/rate-limit.guard';

@ApiTags('saved-projects')
@Controller('saved-projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SavedProjectsController {
  constructor(private readonly savedProjectsService: SavedProjectsService) {}

  @Post(':projectId')
  @RateLimit({ requests: 20, windowMs: 3600000 }) // 20 saves per hour
  @ApiOperation({
    summary: 'Save a project',
    description: "Save a project to the user's saved projects list",
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID to save',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 201,
    description: 'Project saved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Project saved successfully' },
        savedProject: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            projectId: { type: 'string' },
            savedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 409, description: 'Project already saved' })
  async saveProject(@Param('projectId') projectId: string, @Request() req) {
    return this.savedProjectsService.saveProject(req.user.userId, projectId);
  }

  @Get()
  @ApiOperation({
    summary: "Get user's saved projects",
    description: 'Retrieve all projects saved by the authenticated user',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of projects per page (max 50)',
    example: 12,
  })
  @ApiResponse({
    status: 200,
    description: 'Saved projects retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        savedProjects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              project: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  budget: { type: 'number' },
                  status: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
              savedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async getSavedProjects(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '12',
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 50);

    return this.savedProjectsService.getSavedProjects(req.user.userId, {
      page: pageNum,
      limit: limitNum,
    });
  }

  @Get('check/:projectId')
  @ApiOperation({
    summary: 'Check if project is saved',
    description:
      'Check if a specific project is saved by the authenticated user',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID to check',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Check completed successfully',
    schema: {
      type: 'object',
      properties: {
        isSaved: { type: 'boolean' },
        savedProjectId: { type: 'string', nullable: true },
      },
    },
  })
  async checkIfSaved(@Param('projectId') projectId: string, @Request() req) {
    return this.savedProjectsService.checkIfSaved(req.user.userId, projectId);
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unsave a project',
    description: "Remove a project from the user's saved projects list",
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID to unsave',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Project unsaved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Project unsaved successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Saved project not found' })
  async unsaveProject(@Param('projectId') projectId: string, @Request() req) {
    return this.savedProjectsService.unsaveProject(req.user.userId, projectId);
  }

  @Get('stats/count')
  @ApiOperation({
    summary: 'Get saved projects count',
    description: 'Get the count of saved projects for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  async getSavedProjectsCount(@Request() req) {
    return this.savedProjectsService.getSavedProjectsCount(req.user.userId);
  }
}
