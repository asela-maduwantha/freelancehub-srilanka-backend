import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { SkillsService } from '../services/skills.service';
import { CreateSkillDto } from '../dto/create-skill.dto';
import { UpdateSkillDto } from '../dto/update-skill.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/guards/roles.guard';
import { RateLimit } from '../../../common/guards/rate-limit.guard';

@ApiTags('skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all skills with optional filtering',
    description: 'Retrieve skills with pagination and category filtering',
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
    description: 'Number of skills per page (max 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
    example: 'programming',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search skills by name',
    example: 'JavaScript',
  })
  @ApiResponse({
    status: 200,
    description: 'Skills retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        skills: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              category: { type: 'string' },
              description: { type: 'string' },
              popularity: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async getAllSkills(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);

    return this.skillsService.getAllSkills({
      page: pageNum,
      limit: limitNum,
      category,
      search,
    });
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get all skill categories',
    description: 'Retrieve all available skill categories',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          skillCount: { type: 'number' },
        },
      },
    },
  })
  async getCategories() {
    return this.skillsService.getCategories();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get skill by ID',
    description: 'Retrieve a specific skill by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Skill ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Skill retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        category: { type: 'string' },
        description: { type: 'string' },
        popularity: { type: 'number' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async getSkillById(@Param('id') id: string) {
    return this.skillsService.getSkillById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @RateLimit({ requests: 10, windowMs: 3600000 }) // 10 skills per hour for admin
  @ApiOperation({
    summary: 'Create a new skill',
    description: 'Create a new skill (Admin only)',
  })
  @ApiBody({ type: CreateSkillDto })
  @ApiResponse({
    status: 201,
    description: 'Skill created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        category: { type: 'string' },
        description: { type: 'string' },
        popularity: { type: 'number' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 409, description: 'Skill already exists' })
  async createSkill(@Body() createSkillDto: CreateSkillDto) {
    return this.skillsService.createSkill(createSkillDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a skill',
    description: 'Update an existing skill (Admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Skill ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateSkillDto })
  @ApiResponse({
    status: 200,
    description: 'Skill updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        category: { type: 'string' },
        description: { type: 'string' },
        popularity: { type: 'number' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async updateSkill(
    @Param('id') id: string,
    @Body() updateSkillDto: UpdateSkillDto,
  ) {
    return this.skillsService.updateSkill(id, updateSkillDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a skill',
    description: 'Delete an existing skill (Admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Skill ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Skill deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Skill deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async deleteSkill(@Param('id') id: string) {
    return this.skillsService.deleteSkill(id);
  }

  @Get('popular/top')
  @ApiOperation({
    summary: 'Get top popular skills',
    description: 'Retrieve the most popular skills',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of skills to return (max 50)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Popular skills retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          category: { type: 'string' },
          popularity: { type: 'number' },
        },
      },
    },
  })
  async getPopularSkills(@Query('limit') limit: string = '10') {
    const limitNum = Math.min(parseInt(limit, 10), 50);
    return this.skillsService.getPopularSkills(limitNum);
  }
}
