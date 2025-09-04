import { Body, Controller, Put, UseGuards, Request, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/guards/roles.guard';
import { EditFreelancerProfileType, FreelancerProfileResponse, UpdateFreelancerProfileRequest } from '../types/freelancer-profile.types';
import { UpdateFreelancerProfileDto } from '../../../dto/freelancer-profile.dto';
import { FreelancersService } from '../services/freelancers.service';

@ApiTags('freelancers')
@Controller('freelancers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('freelancer')
export class FreelancersController {
  constructor(private readonly freelancersService: FreelancersService) {}

  @Put('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update freelancer profile',
    description: 'Update the authenticated freelancer\'s profile information'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            title: { type: 'string', example: 'Senior Full Stack Developer' },
            bio: { type: 'string', example: 'Experienced developer...' },
            skills: {
              type: 'array',
              items: { type: 'string' },
              example: ['React', 'Node.js', 'TypeScript']
            },
            hourlyRate: { type: 'number', example: 75 },
            availability: { type: 'string', example: 'available' }
          }
        },
        message: { type: 'string', example: 'Profile updated successfully' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Validation failed' },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string', example: 'hourlyRate' },
              message: { type: 'string', example: 'Hourly rate must be a positive number' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - invalid or missing token'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - user is not a freelancer'
  })
  async updateProfile(
    @Request() req: any,
    @Body() updateData: UpdateFreelancerProfileDto,
  ): Promise<FreelancerProfileResponse> {
    try {
      const freelancerId = req.user.userId;
      const updatedProfile = await this.freelancersService.updateProfile(freelancerId, updateData);

      return {
        success: true,
        data: updatedProfile as any, // Type casting to resolve schema vs types incompatibility
        message: 'Profile updated successfully'
      };
    } catch (error) {
      throw error; // Let global exception filter handle it
    }
  }
}
