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
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { BatchCreateSkillDto } from './dto/batch-create-skill.dto';
import {
  SkillResponseDto,
  SkillsListResponseDto,
  MessageResponseDto,
} from './dto/skill-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new skill (Admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Skill created successfully',
    type: SkillResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  async create(
    @Body(ValidationPipe) createSkillDto: CreateSkillDto,
  ): Promise<SkillResponseDto> {
    return this.skillsService.create(createSkillDto);
  }

  @Post('batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create multiple skills in batch (Admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Skills created successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error or duplicate skills',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  async batchCreate(
    @Body(ValidationPipe) batchCreateSkillDto: BatchCreateSkillDto,
  ): Promise<MessageResponseDto> {
    return this.skillsService.batchCreate(batchCreateSkillDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all skills (Public)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'difficulty', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skills retrieved successfully',
    type: SkillsListResponseDto,
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<SkillsListResponseDto> {
    return this.skillsService.findAll(
      page,
      limit,
      category,
      difficulty,
      search,
      isActive,
    );
  }

  @Get('popular')
  @Public()
  @ApiOperation({ summary: 'Get popular skills (Public)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Popular skills retrieved successfully',
    type: [SkillResponseDto],
  })
  async findPopular(
    @Query('limit') limit: number = 20,
  ): Promise<SkillResponseDto[]> {
    return this.skillsService.findPopular(limit);
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search skills (Public)' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skills search results',
    type: [SkillResponseDto],
  })
  async searchSkills(
    @Query('q') query: string,
    @Query('limit') limit: number = 10,
  ): Promise<SkillResponseDto[]> {
    return this.skillsService.searchSkills(query, limit);
  }

  @Get('category/:category')
  @Public()
  @ApiOperation({ summary: 'Get skills by category (Public)' })
  @ApiParam({ name: 'category', description: 'Skill category' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skills by category retrieved successfully',
    type: SkillsListResponseDto,
  })
  async findByCategory(
    @Param('category') category: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<SkillsListResponseDto> {
    return this.skillsService.findByCategory(category, page, limit);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a skill by ID (Public)' })
  @ApiParam({ name: 'id', description: 'Skill ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skill retrieved successfully',
    type: SkillResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Skill not found',
  })
  async findOne(@Param('id') id: string): Promise<SkillResponseDto> {
    return this.skillsService.findOne(id);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get a skill by slug (Public)' })
  @ApiParam({ name: 'slug', description: 'Skill slug' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skill retrieved successfully',
    type: SkillResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Skill not found',
  })
  async findBySlug(@Param('slug') slug: string): Promise<SkillResponseDto> {
    return this.skillsService.findBySlug(slug);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a skill (Admin only)' })
  @ApiParam({ name: 'id', description: 'Skill ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skill updated successfully',
    type: SkillResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Skill not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateSkillDto: UpdateSkillDto,
  ): Promise<SkillResponseDto> {
    return this.skillsService.update(id, updateSkillDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a skill (Admin only)' })
  @ApiParam({ name: 'id', description: 'Skill ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skill deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Skill not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  async remove(@Param('id') id: string): Promise<MessageResponseDto> {
    return this.skillsService.remove(id);
  }
}
