import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ValidationPipe,
  Post,
  UseInterceptors,
  UploadedFile,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import {
  UserResponseDto,
  UsersListResponseDto,
  MessageResponseDto,
} from './dto/user-response.dto';
import { UploadAvatarResponseDto } from './dto/upload-avatar.dto';
import { UpdateFreelancerProfileDto } from './dto/update-freelancer-profile.dto';
import { AddSkillsDto } from './dto/add-skills.dto';
import { AddPortfolioItemDto } from './dto/add-portfolio-item.dto';
import { UpdatePortfolioItemDto } from './dto/update-portfolio-item.dto';
import { AddEducationDto } from './dto/add-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { AddCertificationDto } from './dto/add-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';
import { SearchFreelancersDto } from './dto/search-freelancers.dto';
import {
  FreelancersSearchResponseDto,
  FreelancerPublicProfileDto,
} from './dto/freelancer-public-profile.dto';
import { ClientPublicProfileDto } from './dto/client-public-profile.dto';
import {
  UserSettingsResponseDto,
  UserSettingsDto,
} from './dto/user-settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async getCurrentUser(
    @CurrentUser('id') userId: string,
  ): Promise<UserResponseDto> {
    return this.usersService.getCurrentUser(userId);
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  async updateCurrentUser(
    @CurrentUser('id') userId: string,
    @Body(ValidationPipe) updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateCurrentUser(userId, updateProfileDto);
  }

  @Get('freelancers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and filter freelancers' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Freelancers search results',
    type: FreelancersSearchResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  async searchFreelancers(
    @Query() searchFreelancersDto: SearchFreelancersDto,
  ): Promise<FreelancersSearchResponseDto> {
    return this.usersService.searchFreelancers(searchFreelancersDto);
  }

  @Get('freelancers/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get freelancer public profile' })
  @ApiParam({ name: 'id', description: 'Freelancer ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Freelancer public profile',
    type: FreelancerPublicProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Freelancer not found',
  })
  async getFreelancerPublicProfile(
    @Param('id') freelancerId: string,
  ): Promise<FreelancerPublicProfileDto> {
    return this.usersService.getFreelancerPublicProfile(freelancerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async getUserById(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId?: string,
  ): Promise<UserResponseDto> {
    return this.usersService.getUserById(id, currentUserId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
    type: UsersListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getUsers(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('role') role?: UserRole,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
  ): Promise<UsersListResponseDto> {
    return this.usersService.getUsers(page, limit, role, isActive, search);
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user status (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User status updated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  async updateUserStatus(
    @Param('id') id: string,
    @Body(ValidationPipe) updateStatusDto: UpdateStatusDto,
    @CurrentUser('id') currentUserId: string,
  ): Promise<MessageResponseDto> {
    return this.usersService.updateUserStatus(
      id,
      updateStatusDto,
      currentUserId,
    );
  }

  @Post('upload-avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'Upload profile avatar image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Avatar image file',
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (jpg, jpeg, png, gif)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Avatar uploaded successfully',
    type: UploadAvatarResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file or upload error',
  })
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadAvatarResponseDto> {
    return this.usersService.uploadAvatar(userId, file);
  }

  @Delete('avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete profile avatar' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Avatar deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found or no avatar to delete',
  })
  async deleteAvatar(
    @CurrentUser('id') userId: string,
  ): Promise<MessageResponseDto> {
    return this.usersService.deleteAvatar(userId);
  }

  @Put('freelancer/profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update freelancer-specific data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Freelancer profile updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a freelancer',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  async updateFreelancerProfile(
    @CurrentUser('id') userId: string,
    @Body(ValidationPipe)
    updateFreelancerProfileDto: UpdateFreelancerProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateFreelancerProfile(
      userId,
      updateFreelancerProfileDto,
    );
  }

  @Post('freelancer/skills')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add skills to freelancer profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skills added successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a freelancer',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  async addFreelancerSkills(
    @CurrentUser('id') userId: string,
    @Body(ValidationPipe) addSkillsDto: AddSkillsDto,
  ): Promise<MessageResponseDto> {
    return this.usersService.addFreelancerSkills(userId, addSkillsDto.skills);
  }

  @Delete('freelancer/skills/:skill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove skill from freelancer profile' })
  @ApiParam({ name: 'skill', description: 'Skill to remove' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Skill removed successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found or skill not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a freelancer',
  })
  async removeFreelancerSkill(
    @CurrentUser('id') userId: string,
    @Param('skill') skill: string,
  ): Promise<MessageResponseDto> {
    return this.usersService.removeFreelancerSkill(userId, skill);
  }

  @Post('freelancer/portfolio')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add portfolio item to freelancer profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio item added successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a freelancer',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  async addPortfolioItem(
    @CurrentUser('id') userId: string,
    @Body(ValidationPipe) addPortfolioItemDto: AddPortfolioItemDto,
  ): Promise<MessageResponseDto> {
    return this.usersService.addPortfolioItem(userId, addPortfolioItemDto);
  }

  @Put('freelancer/portfolio/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update portfolio item in freelancer profile' })
  @ApiParam({ name: 'id', description: 'Portfolio item ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio item updated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or portfolio item not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a freelancer',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  async updatePortfolioItem(
    @CurrentUser('id') userId: string,
    @Param('id') portfolioItemId: string,
    @Body(ValidationPipe) updatePortfolioItemDto: UpdatePortfolioItemDto,
  ): Promise<MessageResponseDto> {
    return this.usersService.updatePortfolioItem(
      userId,
      portfolioItemId,
      updatePortfolioItemDto,
    );
  }

  @Delete('freelancer/portfolio/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete portfolio item from freelancer profile' })
  @ApiParam({ name: 'id', description: 'Portfolio item ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio item deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or portfolio item not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a freelancer',
  })
  async deletePortfolioItem(
    @CurrentUser('id') userId: string,
    @Param('id') portfolioItemId: string,
  ): Promise<MessageResponseDto> {
    return this.usersService.deletePortfolioItem(userId, portfolioItemId);
  }

  @Post('freelancer/education')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add education record to freelancer profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Education record added successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a freelancer',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  async addEducationRecord(
    @CurrentUser('id') userId: string,
    @Body(ValidationPipe) addEducationDto: AddEducationDto,
  ): Promise<MessageResponseDto> {
    return this.usersService.addEducationRecord(userId, addEducationDto);
  }

  @Put('freelancer/education/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update education record in freelancer profile' })
  @ApiParam({ name: 'id', description: 'Education record ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Education record updated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or education record not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a freelancer',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  async updateEducationRecord(
    @CurrentUser('id') userId: string,
    @Param('id') educationRecordId: string,
    @Body(ValidationPipe) updateEducationDto: UpdateEducationDto,
  ): Promise<MessageResponseDto> {
    return this.usersService.updateEducationRecord(
      userId,
      educationRecordId,
      updateEducationDto,
    );
  }

  @Delete('freelancer/education/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete education record from freelancer profile' })
  @ApiParam({ name: 'id', description: 'Education record ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Education record deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or education record not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a freelancer',
  })
  async deleteEducationRecord(
    @CurrentUser('id') userId: string,
    @Param('id') educationRecordId: string,
  ): Promise<MessageResponseDto> {
    return this.usersService.deleteEducationRecord(userId, educationRecordId);
  }

  @Post('freelancer/certification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add certification to freelancer profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certification added successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a freelancer',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  async addCertification(
    @CurrentUser('id') userId: string,
    @Body(ValidationPipe) addCertificationDto: AddCertificationDto,
  ): Promise<MessageResponseDto> {
    return this.usersService.addCertification(userId, addCertificationDto);
  }

  @Put('freelancer/certification/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update certification in freelancer profile' })
  @ApiParam({ name: 'id', description: 'Certification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certification updated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or certification not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a freelancer',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  async updateCertification(
    @CurrentUser('id') userId: string,
    @Param('id') certificationId: string,
    @Body(ValidationPipe) updateCertificationDto: UpdateCertificationDto,
  ): Promise<MessageResponseDto> {
    return this.usersService.updateCertification(
      userId,
      certificationId,
      updateCertificationDto,
    );
  }

  @Delete('freelancer/certification/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete certification from freelancer profile' })
  @ApiParam({ name: 'id', description: 'Certification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certification deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or certification not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a freelancer',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  async deleteCertification(
    @CurrentUser('id') userId: string,
    @Param('id') certificationId: string,
  ): Promise<MessageResponseDto> {
    return this.usersService.deleteCertification(userId, certificationId);
  }

  @Put('client/profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update client profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Client profile updated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a client',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  async updateClientProfile(
    @CurrentUser('id') userId: string,
    @Body(ValidationPipe) updateClientProfileDto: UpdateClientProfileDto,
  ): Promise<MessageResponseDto> {
    return this.usersService.updateClientProfile(
      userId,
      updateClientProfileDto,
    );
  }

  @Get('clients/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get client public profile' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Client public profile',
    type: ClientPublicProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Client not found',
  })
  async getClientPublicProfile(
    @Param('id') clientId: string,
  ): Promise<ClientPublicProfileDto> {
    return this.usersService.getClientPublicProfile(clientId);
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user account settings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User settings retrieved successfully',
    type: UserSettingsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async getUserSettings(
    @CurrentUser('id') userId: string,
  ): Promise<UserSettingsResponseDto> {
    return this.usersService.getUserSettings(userId);
  }

  @Put('settings')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user account settings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User settings updated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  async updateUserSettings(
    @CurrentUser('id') userId: string,
    @Body(ValidationPipe) updateSettingsDto: UserSettingsDto,
  ): Promise<MessageResponseDto> {
    return this.usersService.updateUserSettings(userId, updateSettingsDto);
  }

  @Put('deactivate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate user account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account deactivated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Account is already deactivated',
  })
  async deactivateAccount(
    @CurrentUser('id') userId: string,
  ): Promise<MessageResponseDto> {
    return this.usersService.deactivateAccount(userId);
  }

  @Put('reactivate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate user account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account reactivated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Account is already active',
  })
  async reactivateAccount(
    @CurrentUser('id') userId: string,
  ): Promise<MessageResponseDto> {
    return this.usersService.reactivateAccount(userId);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete user account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account permanently deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async deleteAccount(
    @CurrentUser('id') userId: string,
  ): Promise<MessageResponseDto> {
    return this.usersService.deleteAccount(userId);
  }
}
