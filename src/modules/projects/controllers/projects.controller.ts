import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('projects')
@Controller('clients/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('public')
  @ApiOperation({ summary: 'Get public projects (no authentication required)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of projects to return', example: 5 })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field', example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order', example: 'desc' })
  @ApiResponse({
    status: 200,
    description: 'Public projects retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        projects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              budget: { type: 'number' },
              status: { type: 'string' },
              category: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getPublicProjects(@Query() query: any) {
    return this.projectsService.getProjects({ ...query, status: 'open' });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
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

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all projects with optional filters' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by project status' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'minBudget', required: false, description: 'Minimum budget filter' })
  @ApiQuery({ name: 'maxBudget', required: false, description: 'Maximum budget filter' })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        projects: {
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
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getProjects(@Query() query: any) {
    return this.projectsService.getProjects(query);
  }

  @Get('my-projects')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user\'s projects (client view)' })
  @ApiResponse({
    status: 200,
    description: 'Client projects retrieved successfully',
  })
  async getClientProjects(@Request() req, @Query() query: any) {
    return this.projectsService.getClientProjects(req.user.userId, query);
  }

  @Get('my-proposals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user\'s proposals (freelancer view)' })
  @ApiResponse({
    status: 200,
    description: 'Freelancer proposals retrieved successfully',
  })
  async getFreelancerProposals(@Request() req, @Query() query: any) {
    return this.projectsService.getFreelancerProposals(req.user.userId, query);
  }

  @Get('assigned')
  @UseGuards(JwtAuthGuard)
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
    await this.projectsService.submitProposal(projectId, req.user.userId, submitProposalDto);
    return { message: 'Proposal submitted successfully' };
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
    return this.projectsService.getProposals(projectId, req.user.userId);
  }

  @Post(':id/proposals/:proposalId/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Accept a proposal' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiParam({ name: 'proposalId', description: 'Proposal ID' })
  @ApiResponse({
    status: 200,
    description: 'Proposal accepted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Proposal accepted successfully' },
      },
    },
  })
  async acceptProposal(@Request() req, @Param('id') projectId: string, @Param('proposalId') proposalId: string) {
    await this.projectsService.acceptProposal(projectId, proposalId, req.user.userId);
    return { message: 'Proposal accepted successfully' };
  }
}
