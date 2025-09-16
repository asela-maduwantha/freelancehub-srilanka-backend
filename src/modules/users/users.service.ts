import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserProfile, Language, PortfolioItem, Education, Certification } from '../../database/schemas/user.schema';
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
import { FreelancersSearchResponseDto, FreelancerPublicProfileDto } from './dto/freelancer-public-profile.dto';
import { ClientPublicProfileDto } from './dto/client-public-profile.dto';
import { UserSettingsResponseDto, UserSettingsDto } from './dto/user-settings.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { RESPONSE_MESSAGES } from '../../common/constants/response-messages';
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.userModel
      .findById(userId)
      .select('-password -deletedAt')
      .exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    return this.mapToUserResponseDto(user);
  }

  async updateCurrentUser(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    // Initialize profile if it doesn't exist
    if (!user.profile) {
      user.profile = {
        firstName: '',
        lastName: '',
      } as UserProfile;
    }

    // Update profile fields
    if (updateProfileDto.firstName !== undefined) {
      user.profile.firstName = updateProfileDto.firstName;
    }

    if (updateProfileDto.lastName !== undefined) {
      user.profile.lastName = updateProfileDto.lastName;
    }

    if (updateProfileDto.avatar !== undefined) {
      user.profile.avatar = updateProfileDto.avatar;
    }

    if (updateProfileDto.phone !== undefined) {
      user.profile.phone = updateProfileDto.phone;
    }

    if (updateProfileDto.dateOfBirth !== undefined) {
      user.profile.dateOfBirth = new Date(updateProfileDto.dateOfBirth);
    }

    if (updateProfileDto.gender !== undefined) {
      user.profile.gender = updateProfileDto.gender;
    }

    if (updateProfileDto.bio !== undefined) {
      user.profile.bio = updateProfileDto.bio;
    }

    if (updateProfileDto.location !== undefined) {
      user.profile.location = updateProfileDto.location;
    }

    if (updateProfileDto.website !== undefined) {
      user.profile.website = updateProfileDto.website;
    }

    if (updateProfileDto.socialLinks !== undefined) {
      user.profile.socialLinks = updateProfileDto.socialLinks;
    }

    await user.save();

    // Return updated user without password
    const updatedUser = await this.userModel
      .findById(userId)
      .select('-password -deletedAt')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    return this.mapToUserResponseDto(updatedUser);
  }

  async getUserById(
    id: string,
    currentUserId?: string,
  ): Promise<UserResponseDto> {
    const user = await this.userModel
      .findById(id)
      .select('-password -deletedAt')
      .exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    // If user is not active and requester is not admin, don't show
    if (!user.isActive && currentUserId) {
      const currentUser = await this.userModel.findById(currentUserId).exec();
      if (!currentUser || currentUser.role !== UserRole.ADMIN) {
        throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
      }
    }

    return this.mapToUserResponseDto(user);
  }

  async getUsers(
    page: number = 1,
    limit: number = 10,
    role?: UserRole,
    isActive?: boolean,
    search?: string,
  ): Promise<UsersListResponseDto> {
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive;
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password -deletedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users: users.map((user) => this.mapToUserResponseDto(user)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Update user status (admin only)
  async updateUserStatus(
    id: string,
    updateStatusDto: UpdateStatusDto,
    currentUserId: string,
  ): Promise<MessageResponseDto> {
    const currentUser = await this.userModel.findById(currentUserId).exec();
    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException(RESPONSE_MESSAGES.AUTH.UNAUTHORIZED);
    }

    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    // Prevent admin from deactivating themselves
    if (id === currentUserId && !updateStatusDto.isActive) {
      throw new BadRequestException('Cannot deactivate your own account');
    }

    user.isActive = updateStatusDto.isActive;
    await user.save();

    return {
      message: updateStatusDto.isActive
        ? RESPONSE_MESSAGES.USER.ACCOUNT_ACTIVATED
        : RESPONSE_MESSAGES.USER.ACCOUNT_DEACTIVATED,
    };
  }

  // Helper method to map User to UserResponseDto
  private mapToUserResponseDto(user: any): UserResponseDto {
    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      profile: user.profile,
      freelancerData:
        user.role === UserRole.FREELANCER ? user.freelancerData : undefined,
      clientData: user.role === UserRole.CLIENT ? user.clientData : undefined,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      fullName:
        user.fullName ||
        `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim(),
    };
  }

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<UploadAvatarResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    // Initialize profile if it doesn't exist
    if (!user.profile) {
      user.profile = {
        firstName: '',
        lastName: '',
      } as UserProfile;
    }

    // Store the file path as avatar URL
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    user.profile.avatar = avatarUrl;

    await user.save();

    return {
      message: RESPONSE_MESSAGES.USER.AVATAR_UPLOADED,
      avatarUrl,
    };
  }

  async deleteAvatar(userId: string): Promise<MessageResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    if (!user.profile?.avatar) {
      throw new NotFoundException('No avatar to delete');
    }

    // TODO: Delete the actual file from storage
    // For now, just remove the reference
    user.profile.avatar = undefined;
    await user.save();

    return {
      message: 'Avatar deleted successfully',
    };
  }

  async updateFreelancerProfile(
    userId: string,
    updateFreelancerProfileDto: UpdateFreelancerProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    if (user.role !== UserRole.FREELANCER) {
      throw new ForbiddenException('User is not a freelancer');
    }

    // Initialize freelancerData if it doesn't exist
    if (!user.freelancerData) {
      user.freelancerData = {
        skills: [],
        totalEarned: 0,
        completedJobs: 0,
        rating: 0,
        reviewCount: 0,
      };
    }

    // Update freelancer-specific fields
    if (updateFreelancerProfileDto.hourlyRate !== undefined) {
      user.freelancerData.hourlyRate = updateFreelancerProfileDto.hourlyRate;
    }

    if (updateFreelancerProfileDto.availability !== undefined) {
      user.freelancerData.availability = updateFreelancerProfileDto.availability;
    }

    if (updateFreelancerProfileDto.experience !== undefined) {
      user.freelancerData.experience = updateFreelancerProfileDto.experience;
    }

    if (updateFreelancerProfileDto.languages !== undefined) {
      // Convert string array to Language objects
      user.freelancerData.languages = updateFreelancerProfileDto.languages.map(lang => ({
        language: lang,
        proficiency: 'fluent', // Default proficiency
      }));
    }

    await user.save();

    // Return updated user
    const updatedUser = await this.userModel
      .findById(userId)
      .select('-password -deletedAt')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    return this.mapToUserResponseDto(updatedUser);
  }


  async addFreelancerSkills(
    userId: string,
    skills: string[],
  ): Promise<MessageResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    if (user.role !== UserRole.FREELANCER) {
      throw new ForbiddenException('User is not a freelancer');
    }

    // Initialize freelancerData if it doesn't exist
    if (!user.freelancerData) {
      user.freelancerData = {
        skills: [],
        totalEarned: 0,
        completedJobs: 0,
        rating: 0,
        reviewCount: 0,
      };
    }

    // Add new skills (avoid duplicates)
    const existingSkills = new Set(user.freelancerData.skills);
    const newSkills = skills.filter(skill => !existingSkills.has(skill));

    if (newSkills.length === 0) {
      throw new BadRequestException('All provided skills are already added');
    }

    user.freelancerData.skills.push(...newSkills);
    await user.save();

    return {
      message: `Successfully added ${newSkills.length} skill(s) to freelancer profile`,
    };
  }

  // Remove freelancer skill
  async removeFreelancerSkill(
    userId: string,
    skill: string,
  ): Promise<MessageResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    if (user.role !== UserRole.FREELANCER) {
      throw new ForbiddenException('User is not a freelancer');
    }

    if (!user.freelancerData) {
      throw new NotFoundException('Freelancer data not found');
    }

    const skillIndex = user.freelancerData.skills.indexOf(skill);
    if (skillIndex === -1) {
      throw new NotFoundException('Skill not found in freelancer profile');
    }

    user.freelancerData.skills.splice(skillIndex, 1);
    await user.save();

    return {
      message: 'Skill removed successfully from freelancer profile',
    };
  }


  async addPortfolioItem(
    userId: string,
    addPortfolioItemDto: AddPortfolioItemDto,
  ): Promise<MessageResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    if (user.role !== UserRole.FREELANCER) {
      throw new ForbiddenException('User is not a freelancer');
    }

    // Initialize freelancerData if it doesn't exist
    if (!user.freelancerData) {
      user.freelancerData = {
        skills: [],
        totalEarned: 0,
        completedJobs: 0,
        rating: 0,
        reviewCount: 0,
        portfolio: [],
      };
    }

    // Initialize portfolio array if it doesn't exist
    if (!user.freelancerData.portfolio) {
      user.freelancerData.portfolio = [];
    }

    const portfolioItem: PortfolioItem = {
      title: addPortfolioItemDto.title,
      description: addPortfolioItemDto.description,
      images: addPortfolioItemDto.images || [],
      url: addPortfolioItemDto.url,
      technologies: addPortfolioItemDto.technologies || [],
    };

    user.freelancerData.portfolio.push(portfolioItem);
    await user.save();

    return {
      message: 'Portfolio item added successfully to freelancer profile',
    };
  }

  // Update portfolio item
  async updatePortfolioItem(
    userId: string,
    portfolioItemId: string,
    updatePortfolioItemDto: UpdatePortfolioItemDto,
  ): Promise<MessageResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    if (user.role !== UserRole.FREELANCER) {
      throw new ForbiddenException('User is not a freelancer');
    }

    if (!user.freelancerData?.portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const portfolioItemIndex = user.freelancerData.portfolio.findIndex(
      (item, index) => index.toString() === portfolioItemId
    );

    if (portfolioItemIndex === -1) {
      throw new NotFoundException('Portfolio item not found');
    }

    const portfolioItem = user.freelancerData.portfolio[portfolioItemIndex];

    // Update fields if provided
    if (updatePortfolioItemDto.title !== undefined) {
      portfolioItem.title = updatePortfolioItemDto.title;
    }
    if (updatePortfolioItemDto.description !== undefined) {
      portfolioItem.description = updatePortfolioItemDto.description;
    }
    if (updatePortfolioItemDto.images !== undefined) {
      portfolioItem.images = updatePortfolioItemDto.images;
    }
    if (updatePortfolioItemDto.url !== undefined) {
      portfolioItem.url = updatePortfolioItemDto.url;
    }
    if (updatePortfolioItemDto.technologies !== undefined) {
      portfolioItem.technologies = updatePortfolioItemDto.technologies;
    }

    await user.save();

    return {
      message: 'Portfolio item updated successfully',
    };
  }

  // Delete portfolio item
  async deletePortfolioItem(
    userId: string,
    portfolioItemId: string,
  ): Promise<MessageResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    if (user.role !== UserRole.FREELANCER) {
      throw new ForbiddenException('User is not a freelancer');
    }

    if (!user.freelancerData?.portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const portfolioItemIndex = user.freelancerData.portfolio.findIndex(
      (item, index) => index.toString() === portfolioItemId
    );

    if (portfolioItemIndex === -1) {
      throw new NotFoundException('Portfolio item not found');
    }

    user.freelancerData.portfolio.splice(portfolioItemIndex, 1);
    await user.save();

    return {
      message: 'Portfolio item deleted successfully',
    };
  }


  async addEducationRecord(
    userId: string,
    addEducationDto: AddEducationDto,
  ): Promise<MessageResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    if (user.role !== UserRole.FREELANCER) {
      throw new ForbiddenException('User is not a freelancer');
    }

    // Initialize freelancerData if it doesn't exist
    if (!user.freelancerData) {
      user.freelancerData = {
        skills: [],
        totalEarned: 0,
        completedJobs: 0,
        rating: 0,
        reviewCount: 0,
        education: [],
      };
    }

    // Initialize education array if it doesn't exist
    if (!user.freelancerData.education) {
      user.freelancerData.education = [];
    }

    const educationRecord: Education = {
      degree: addEducationDto.degree,
      institution: addEducationDto.institution,
      year: addEducationDto.year,
    };

    user.freelancerData.education.push(educationRecord);
    await user.save();

    return {
      message: 'Education record added successfully to freelancer profile',
    };
  }

  // Update education record
  async updateEducationRecord(
    userId: string,
    educationRecordId: string,
    updateEducationDto: UpdateEducationDto,
  ): Promise<MessageResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    if (user.role !== UserRole.FREELANCER) {
      throw new ForbiddenException('User is not a freelancer');
    }

    if (!user.freelancerData?.education) {
      throw new NotFoundException('Education records not found');
    }

    const educationRecordIndex = user.freelancerData.education.findIndex(
      (record, index) => index.toString() === educationRecordId
    );

    if (educationRecordIndex === -1) {
      throw new NotFoundException('Education record not found');
    }

    const educationRecord = user.freelancerData.education[educationRecordIndex];

    // Update fields if provided
    if (updateEducationDto.degree !== undefined) {
      educationRecord.degree = updateEducationDto.degree;
    }
    if (updateEducationDto.institution !== undefined) {
      educationRecord.institution = updateEducationDto.institution;
    }
    if (updateEducationDto.year !== undefined) {
      educationRecord.year = updateEducationDto.year;
    }

    await user.save();

    return {
      message: 'Education record updated successfully',
    };
  }

  // Delete education record
  async deleteEducationRecord(
    userId: string,
    educationRecordId: string,
  ): Promise<MessageResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    if (user.role !== UserRole.FREELANCER) {
      throw new ForbiddenException('User is not a freelancer');
    }

    if (!user.freelancerData?.education) {
      throw new NotFoundException('Education records not found');
    }

    const educationRecordIndex = user.freelancerData.education.findIndex(
      (record, index) => index.toString() === educationRecordId
    );

    if (educationRecordIndex === -1) {
      throw new NotFoundException('Education record not found');
    }

    user.freelancerData.education.splice(educationRecordIndex, 1);
    await user.save();

    return {
      message: 'Education record deleted successfully',
    };
  }


  async addCertification(
    userId: string,
    addCertificationDto: AddCertificationDto,
  ): Promise<MessageResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    if (user.role !== UserRole.FREELANCER) {
      throw new ForbiddenException('User is not a freelancer');
    }

    // Initialize freelancerData if it doesn't exist
    if (!user.freelancerData) {
      user.freelancerData = {
        skills: [],
        totalEarned: 0,
        completedJobs: 0,
        rating: 0,
        reviewCount: 0,
        certifications: [],
      };
    }

    // Initialize certifications array if it doesn't exist
    if (!user.freelancerData.certifications) {
      user.freelancerData.certifications = [];
    }

    const certification: Certification = {
      name: addCertificationDto.name,
      issuer: addCertificationDto.issuer,
      date: new Date(addCertificationDto.date),
      url: addCertificationDto.url,
    };

    user.freelancerData.certifications.push(certification);
    await user.save();

    return {
      message: 'Certification added successfully to freelancer profile',
    };
  }

  // Update certification
  async updateCertification(
    userId: string,
    certificationId: string,
    updateCertificationDto: UpdateCertificationDto,
  ): Promise<MessageResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    if (user.role !== UserRole.FREELANCER) {
      throw new ForbiddenException('User is not a freelancer');
    }

    if (!user.freelancerData?.certifications) {
      throw new NotFoundException('Certifications not found');
    }

    const certificationIndex = user.freelancerData.certifications.findIndex(
      (cert, index) => index.toString() === certificationId
    );

    if (certificationIndex === -1) {
      throw new NotFoundException('Certification not found');
    }

    const certification = user.freelancerData.certifications[certificationIndex];

    // Update fields if provided
    if (updateCertificationDto.name !== undefined) {
      certification.name = updateCertificationDto.name;
    }
    if (updateCertificationDto.issuer !== undefined) {
      certification.issuer = updateCertificationDto.issuer;
    }
    if (updateCertificationDto.date !== undefined) {
      certification.date = new Date(updateCertificationDto.date);
    }
    if (updateCertificationDto.url !== undefined) {
      certification.url = updateCertificationDto.url;
    }

    await user.save();

    return {
      message: 'Certification updated successfully',
    };
  }

  // Delete certification
  async deleteCertification(
    userId: string,
    certificationId: string,
  ): Promise<MessageResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    if (user.role !== UserRole.FREELANCER) {
      throw new ForbiddenException('User is not a freelancer');
    }

    if (!user.freelancerData?.certifications) {
      throw new NotFoundException('Certifications not found');
    }

    const certificationIndex = user.freelancerData.certifications.findIndex(
      (cert, index) => index.toString() === certificationId
    );

    if (certificationIndex === -1) {
      throw new NotFoundException('Certification not found');
    }

    // Remove the certification from the array
    user.freelancerData.certifications.splice(certificationIndex, 1);
    await user.save();

    return {
      message: 'Certification deleted successfully',
    };
  }

  // Update client profile
  async updateClientProfile(
    userId: string,
    updateClientProfileDto: UpdateClientProfileDto,
  ): Promise<MessageResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    if (user.role !== UserRole.CLIENT) {
      throw new ForbiddenException('User is not a client');
    }

    // Initialize clientData if it doesn't exist
    if (!user.clientData) {
      user.clientData = {
        totalSpent: 0,
        postedJobs: 0,
        rating: 0,
        reviewCount: 0,
      };
    }

    // Update fields if provided
    if (updateClientProfileDto.companyName !== undefined) {
      user.clientData.companyName = updateClientProfileDto.companyName;
    }
    if (updateClientProfileDto.companySize !== undefined) {
      user.clientData.companySize = updateClientProfileDto.companySize;
    }
    if (updateClientProfileDto.industry !== undefined) {
      user.clientData.industry = updateClientProfileDto.industry;
    }

    await user.save();

    return {
      message: 'Client profile updated successfully',
    };
  }

  // Search freelancers
  async searchFreelancers(
    searchDto: SearchFreelancersDto,
  ): Promise<FreelancersSearchResponseDto> {
    const {
      query,
      skills,
      minRating,
      location,
      experienceLevel,
      minHourlyRate,
      maxHourlyRate,
      page = 1,
      limit = 10,
    } = searchDto;

    // Build the query filter
    const filter: any = {
      role: UserRole.FREELANCER,
      isActive: true, // Only show active freelancers
    };

    // Text search on name or skills
    if (query) {
      filter.$or = [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { 'freelancerData.skills': { $regex: query, $options: 'i' } },
      ];
    }

    // Skills filter
    if (skills && skills.length > 0) {
      filter['freelancerData.skills'] = { $in: skills };
    }

    // Rating filter
    if (minRating !== undefined) {
      filter['freelancerData.rating'] = { $gte: minRating };
    }

    // Location filter
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }

    // Experience level filter (this would need to be implemented in the schema)
    // For now, we'll skip this as it's not in the current schema

    // Hourly rate filter
    if (minHourlyRate !== undefined || maxHourlyRate !== undefined) {
      filter['freelancerData.hourlyRate'] = {};
      if (minHourlyRate !== undefined) {
        filter['freelancerData.hourlyRate'].$gte = minHourlyRate;
      }
      if (maxHourlyRate !== undefined) {
        filter['freelancerData.hourlyRate'].$lte = maxHourlyRate;
      }
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Execute the query with pagination
    const [freelancers, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select(
          '_id email firstName lastName role avatar location bio freelancerData',
        )
        .populate('freelancerData')
        .sort({ 'freelancerData.rating': -1, 'freelancerData.completedJobs': -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    // Transform the data to match the response DTO
    const freelancerProfiles: FreelancerPublicProfileDto[] = (freelancers as any[]).map(
      (freelancer: any) => ({
        _id: freelancer._id.toString(),
        email: freelancer.email,
        firstName: freelancer.firstName,
        lastName: freelancer.lastName,
        role: freelancer.role,
        avatar: freelancer.avatar,
        location: freelancer.location,
        bio: freelancer.bio,
        skills: freelancer.freelancerData?.skills || [],
        hourlyRate: freelancer.freelancerData?.hourlyRate,
        rating: freelancer.freelancerData?.rating || 0,
        reviewCount: freelancer.freelancerData?.reviewCount || 0,
        totalEarned: freelancer.freelancerData?.totalEarned || 0,
        completedJobs: freelancer.freelancerData?.completedJobs || 0,
        portfolio: freelancer.freelancerData?.portfolio || [],
        education: freelancer.freelancerData?.education || [],
        certifications: freelancer.freelancerData?.certifications || [],
      }),
    );

    const totalPages = Math.ceil(total / limit);

    return {
      freelancers: freelancerProfiles,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getFreelancerPublicProfile(
    freelancerId: string,
  ): Promise<FreelancerPublicProfileDto> {
    const freelancer = await this.userModel
      .findOne({
        _id: freelancerId,
        role: UserRole.FREELANCER,
        isActive: true,
      })
      .select(
        '_id email firstName lastName role avatar location bio freelancerData',
      )
      .populate('freelancerData')
      .exec();

    if (!freelancer) {
      throw new NotFoundException('Freelancer not found');
    }

    const freelancerDoc = freelancer as any;

    return {
      _id: freelancerDoc._id.toString(),
      email: freelancerDoc.email,
      firstName: freelancerDoc.firstName,
      lastName: freelancerDoc.lastName,
      role: freelancerDoc.role,
      avatar: freelancerDoc.avatar,
      location: freelancerDoc.location,
      bio: freelancerDoc.bio,
      skills: freelancerDoc.freelancerData?.skills || [],
      hourlyRate: freelancerDoc.freelancerData?.hourlyRate,
      rating: freelancerDoc.freelancerData?.rating || 0,
      reviewCount: freelancerDoc.freelancerData?.reviewCount || 0,
      totalEarned: freelancerDoc.freelancerData?.totalEarned || 0,
      completedJobs: freelancerDoc.freelancerData?.completedJobs || 0,
      portfolio: freelancerDoc.freelancerData?.portfolio || [],
      education: freelancerDoc.freelancerData?.education || [],
      certifications: freelancerDoc.freelancerData?.certifications || [],
    };
  }


  async getClientPublicProfile(clientId: string): Promise<ClientPublicProfileDto> {
    const client = await this.userModel
      .findOne({
        _id: clientId,
        role: UserRole.CLIENT,
        isActive: true,
      })
      .select(
        '_id email firstName lastName role avatar location bio clientData',
      )
      .populate('clientData')
      .exec();

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const clientDoc = client as any;

    return {
      _id: clientDoc._id.toString(),
      email: clientDoc.email,
      firstName: clientDoc.firstName,
      lastName: clientDoc.lastName,
      role: clientDoc.role,
      avatar: clientDoc.avatar,
      location: clientDoc.location,
      bio: clientDoc.bio,
      companyName: clientDoc.clientData?.companyName,
      companySize: clientDoc.clientData?.companySize,
      industry: clientDoc.clientData?.industry,
      rating: clientDoc.clientData?.rating || 0,
      reviewCount: clientDoc.clientData?.reviewCount || 0,
      totalSpent: clientDoc.clientData?.totalSpent || 0,
      postedJobs: clientDoc.clientData?.postedJobs || 0,
    };
  }


  async getUserSettings(userId: string): Promise<UserSettingsResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    const userDoc = user as any;

    // Return basic user settings (these would be stored in a settings field in a real implementation)
    return {
      emailNotifications: userDoc.emailNotifications ?? true,
      profileVisibility: userDoc.profileVisibility ?? 'public',
      language: userDoc.language ?? 'en',
      timezone: userDoc.timezone ?? 'UTC',
      twoFactorEnabled: userDoc.twoFactorEnabled ?? false,
      isActive: userDoc.isActive ?? true,
      isEmailVerified: userDoc.isEmailVerified ?? false,
    };
  }

  // Update user settings
  async updateUserSettings(
    userId: string,
    updateSettingsDto: UserSettingsDto,
  ): Promise<MessageResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    const userDoc = user as any;

    // Update settings fields if provided
    if (updateSettingsDto.emailNotifications !== undefined) {
      userDoc.emailNotifications = updateSettingsDto.emailNotifications;
    }
    if (updateSettingsDto.profileVisibility !== undefined) {
      userDoc.profileVisibility = updateSettingsDto.profileVisibility;
    }
    if (updateSettingsDto.language !== undefined) {
      userDoc.language = updateSettingsDto.language;
    }
    if (updateSettingsDto.timezone !== undefined) {
      userDoc.timezone = updateSettingsDto.timezone;
    }
    if (updateSettingsDto.twoFactorEnabled !== undefined) {
      userDoc.twoFactorEnabled = updateSettingsDto.twoFactorEnabled;
    }

    await user.save();

    return {
      message: 'User settings updated successfully',
    };
  }

  // Deactivate user account
  async deactivateAccount(userId: string): Promise<MessageResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    if (!user.isActive) {
      throw new BadRequestException('Account is already deactivated');
    }

    user.isActive = false;
    await user.save();

    return {
      message: 'Account deactivated successfully',
    };
  }

  // Reactivate user account
  async reactivateAccount(userId: string): Promise<MessageResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    if (user.isActive) {
      throw new BadRequestException('Account is already active');
    }

    user.isActive = true;
    await user.save();

    return {
      message: 'Account reactivated successfully',
    };
  }

  // Permanently delete user account
  async deleteAccount(userId: string): Promise<MessageResponseDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.USER.NOT_FOUND);
    }

    // Permanently delete the user account
    await this.userModel.findByIdAndDelete(userId).exec();

    return {
      message: 'Account permanently deleted successfully',
    };
  }
}
