import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProjectsService } from '../services/projects.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { SubmitProposalDto } from '../../proposals/dto/submit-proposal.dto';
import { ProposalsService } from '../../proposals/services/proposals.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/guards/roles.guard';
import { RateLimit } from '../../../common/guards/rate-limit.guard';

@ApiTags('projects')
@Controller(['projects', 'freelancers/projects'])
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly proposalsService: ProposalsService,
  ) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes cache
  @ApiOperation({ 
    summary: 'Get projects with filters (public access for open projects, auth required for all)', 
    description: 'Consolidated endpoint that replaces /projects/public. Use status=open for public projects.' 
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of projects per page (max 50)', example: 12 })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort order', example: 'newest' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by project status (open, in-progress, completed)', example: 'open' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'minBudget', required: false, description: 'Minimum budget filter' })
  @ApiQuery({ name: 'maxBudget', required: false, description: 'Maximum budget filter' })
  @ApiQuery({ name: 'skills', required: false, description: 'Filter by skills (comma-separated)' })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              budget: { type: 'number' },
              status: { type: 'string' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            hasNext: { type: 'boolean' },
          },
        },
      },
    },
  })
  async getProjects(@Query() query: any, @Request() req?) {
    // Enforce max limit for performance
    const limit = Math.min(parseInt(query.limit) || 20, 50);
    const page = Math.max(parseInt(query.page) || 1, 1);
    
    const sanitizedQuery = {
      ...query,
      page,
      limit,
      // If no auth, force status to open for public access
      ...((!req?.user && !query.status) && { status: 'open' }),
    };

    return this.projectsService.getProjects(sanitizedQuery);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  @RateLimit({ requests: 5, windowMs: 300000 }) // 5 projects per 5 minutes
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        budget: { type: 'number' },
        status: { type: 'string' },
        clientId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createProject(@Request() req, @Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.createProject(req.user.userId, createProjectDto);
  }

  @Get('my-proposals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('freelancer')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user\'s proposals (freelancer view)' })
  @ApiResponse({
    status: 200,
    description: 'Freelancer proposals retrieved successfully',
  })
  async getFreelancerProposals(@Request() req, @Query() query: any) {
    return this.proposalsService.getUserProposals(req.user.userId);
  }

  @Get('assigned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('freelancer')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get projects assigned to current freelancer' })
  @ApiResponse({
    status: 200,
    description: 'Assigned projects retrieved successfully',
  })
  async getFreelancerProjects(@Request() req, @Query() query: any) {
    return this.projectsService.getFreelancerProjects(req.user.userId, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProjectById(@Param('id') projectId: string) {
    return this.projectsService.getProjectById(projectId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not project owner' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updateProject(@Request() req, @Param('id') projectId: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.updateProject(projectId, req.user.userId, updateProjectDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Project deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not project owner' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async deleteProject(@Request() req, @Param('id') projectId: string) {
    await this.projectsService.deleteProject(projectId, req.user.userId);
    return { message: 'Project deleted successfully' };
  }

  @Post(':id/proposals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Submit proposal for a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 201,
    description: 'Proposal submitted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Proposal submitted successfully' },
      },
    },
  })
  async submitProposal(@Request() req, @Param('id') projectId: string, @Body() submitProposalDto: SubmitProposalDto) {
    return this.proposalsService.submitProposal(req.user.userId, projectId, submitProposalDto);
  }

  @Get(':id/proposals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get proposals for a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Proposals retrieved successfully',
  })
  async getProposals(@Request() req, @Param('id') projectId: string) {
    return this.proposalsService.getProposalsForProject(projectId, req.user.userId);
  }
}
