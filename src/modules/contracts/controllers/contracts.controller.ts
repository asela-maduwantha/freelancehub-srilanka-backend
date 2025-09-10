import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ContractsService } from '../services/contracts.service';
import { CreateContractDto } from '../dto/create-contract.dto';
import { UpdateMilestoneDto } from '../dto/update-milestone.dto';
import { SubmitMilestoneDto } from '../dto/submit-milestone.dto';
import { ApproveMilestoneDto } from '../dto/approve-milestone.dto';
import { RejectMilestoneDto } from '../dto/reject-milestone.dto';
import { CancelContractDto } from '../dto/cancel-contract.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymentMethodsService } from '../../payments/services/payment-methods.service';

@ApiTags('contracts')
@ApiBearerAuth('JWT-auth')
@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly paymentMethodsService: PaymentMethodsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contract' })
  @ApiResponse({
    status: 201,
    description: 'Contract created successfully',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        projectId: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string' },
            budget: { type: 'number' },
            deadline: { type: 'string', format: 'date-time' },
            category: { type: 'string' },
            skills: { type: 'array', items: { type: 'string' } },
            clientId: { type: 'string' },
            freelancerId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        clientId: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string' },
            profilePicture: { type: 'string' },
            phoneNumber: { type: 'string' },
            companyName: { type: 'string' },
            rating: { type: 'number' },
            reviewsCount: { type: 'number' },
          },
        },
        freelancerId: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string' },
            profilePicture: { type: 'string' },
            phoneNumber: { type: 'string' },
            companyName: { type: 'string' },
            rating: { type: 'number' },
            reviewsCount: { type: 'number' },
            skills: { type: 'array', items: { type: 'string' } },
          },
        },
        proposalId: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            proposedBudget: { type: 'number' },
            proposedDuration: {
              type: 'object',
              properties: {
                value: { type: 'number' },
                unit: { type: 'string', enum: ['days', 'weeks', 'months'] },
              },
            },
            coverLetter: { type: 'string' },
            milestones: { type: 'array', items: { type: 'object' } },
            attachments: { type: 'array', items: { type: 'object' } },
            status: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        terms: {
          type: 'object',
          properties: {
            budget: { type: 'number' },
            paymentType: { type: 'string', enum: ['fixed', 'hourly'] },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            paymentSchedule: { type: 'string' },
          },
        },
        milestones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              amount: { type: 'number' },
              dueDate: { type: 'string', format: 'date-time' },
              status: {
                type: 'string',
                enum: [
                  'pending',
                  'in-progress',
                  'submitted',
                  'approved',
                  'rejected',
                ],
              },
              submissions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    files: { type: 'array', items: { type: 'string' } },
                    description: { type: 'string' },
                    submittedAt: { type: 'string', format: 'date-time' },
                    feedback: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        status: {
          type: 'string',
          enum: ['active', 'completed', 'cancelled', 'disputed'],
          default: 'active',
        },
        approvalWorkflow: {
          type: 'object',
          properties: {
            clientApproved: { type: 'boolean', default: false },
            freelancerApproved: { type: 'boolean', default: false },
            clientApprovedAt: { type: 'string', format: 'date-time' },
            freelancerApprovedAt: { type: 'string', format: 'date-time' },
            approvalOrder: {
              type: 'string',
              enum: ['client_first', 'freelancer_first'],
              default: 'client_first',
            },
          },
        },
        pdfUrl: { type: 'string' },
        totalPaid: { type: 'number', default: 0 },
        totalEscrow: { type: 'number', default: 0 },
        completedAt: { type: 'string', format: 'date-time' },
        cancellationReason: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createContract(@Body() createContractDto: CreateContractDto) {
    return this.contractsService.createContract(createContractDto);
  }

  @Post('from-proposal/:proposalId')
  @ApiOperation({ summary: 'Create contract manually from accepted proposal' })
  @ApiParam({ name: 'proposalId', description: 'Proposal ID' })
  @ApiResponse({
    status: 201,
    description: 'Contract created successfully from proposal',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Contract created successfully from proposal',
        },
        contract: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - proposal not found or not accepted',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - no access to proposal',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - contract already exists for this proposal',
  })
  async createContractFromProposal(
    @Param('proposalId') proposalId: string,
    @Request() req,
  ) {
    const clientId = req.user.userId;
    return this.contractsService.createContractFromProposal(
      proposalId,
      clientId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get current user contracts' })
  @ApiResponse({
    status: 200,
    description: 'Contracts retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' },
          budget: { type: 'number' },
          freelancer: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              email: { type: 'string' },
              profilePicture: { type: 'string' },
              phoneNumber: { type: 'string' },
              companyName: { type: 'string' },
              rating: { type: 'number' },
              reviewsCount: { type: 'number' },
              skills: { type: 'array', items: { type: 'string' } },
            },
          },
          client: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              email: { type: 'string' },
              profilePicture: { type: 'string' },
              phoneNumber: { type: 'string' },
              companyName: { type: 'string' },
              rating: { type: 'number' },
              reviewsCount: { type: 'number' },
            },
          },
          projectId: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string' },
              budget: { type: 'number' },
              deadline: { type: 'string', format: 'date-time' },
              category: { type: 'string' },
              skills: { type: 'array', items: { type: 'string' } },
              clientId: { type: 'string' },
              freelancerId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          proposalId: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              proposedBudget: { type: 'number' },
              proposedDuration: {
                type: 'object',
                properties: {
                  value: { type: 'number' },
                  unit: { type: 'string', enum: ['days', 'weeks', 'months'] },
                },
              },
              coverLetter: { type: 'string' },
              milestones: { type: 'array', items: { type: 'object' } },
              attachments: { type: 'array', items: { type: 'object' } },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          milestones: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                amount: { type: 'number' },
                dueDate: { type: 'string', format: 'date-time' },
                status: {
                  type: 'string',
                  enum: [
                    'pending',
                    'in-progress',
                    'submitted',
                    'approved',
                    'rejected',
                  ],
                },
                submissions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      files: { type: 'array', items: { type: 'string' } },
                      description: { type: 'string' },
                      submittedAt: { type: 'string', format: 'date-time' },
                      feedback: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async getUserContracts(@Request() req) {
    return this.contractsService.getUserContracts(req.user.userId);
  }

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'Get contracts by project ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Contracts retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' },
          budget: { type: 'number' },
          projectId: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'string' },
              budget: { type: 'number' },
              deadline: { type: 'string', format: 'date-time' },
            },
          },
          client: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              email: { type: 'string' },
            },
          },
          freelancer: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              email: { type: 'string' },
            },
          },
          milestones: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                amount: { type: 'number' },
                dueDate: { type: 'string', format: 'date-time' },
                status: {
                  type: 'string',
                  enum: [
                    'pending',
                    'in-progress',
                    'submitted',
                    'approved',
                    'rejected',
                  ],
                },
                submissions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      files: { type: 'array', items: { type: 'string' } },
                      description: { type: 'string' },
                      submittedAt: { type: 'string', format: 'date-time' },
                      feedback: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getContractsByProjectId(
    @Param('projectId') projectId: string,
    @Request() req,
  ) {
    return this.contractsService.getContractsByProjectId(
      projectId,
      req.user.userId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contract by ID' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        projectId: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string' },
            budget: { type: 'number' },
            deadline: { type: 'string', format: 'date-time' },
            category: { type: 'string' },
            skills: { type: 'array', items: { type: 'string' } },
            clientId: { type: 'string' },
            freelancerId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        clientId: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string' },
            profilePicture: { type: 'string' },
            phoneNumber: { type: 'string' },
            companyName: { type: 'string' },
            rating: { type: 'number' },
            reviewsCount: { type: 'number' },
            location: { type: 'object' },
            bio: { type: 'string' },
          },
        },
        freelancerId: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string' },
            profilePicture: { type: 'string' },
            phoneNumber: { type: 'string' },
            companyName: { type: 'string' },
            rating: { type: 'number' },
            reviewsCount: { type: 'number' },
            skills: { type: 'array', items: { type: 'string' } },
            location: { type: 'object' },
            bio: { type: 'string' },
          },
        },
        proposalId: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            proposedBudget: { type: 'number' },
            proposedDuration: {
              type: 'object',
              properties: {
                value: { type: 'number' },
                unit: { type: 'string', enum: ['days', 'weeks', 'months'] },
              },
            },
            coverLetter: { type: 'string' },
            milestones: { type: 'array', items: { type: 'object' } },
            attachments: { type: 'array', items: { type: 'object' } },
            status: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        terms: {
          type: 'object',
          properties: {
            budget: { type: 'number' },
            paymentType: { type: 'string', enum: ['fixed', 'hourly'] },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            paymentSchedule: { type: 'string' },
          },
        },
        milestones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              amount: { type: 'number' },
              dueDate: { type: 'string', format: 'date-time' },
              status: {
                type: 'string',
                enum: [
                  'pending',
                  'in-progress',
                  'submitted',
                  'approved',
                  'rejected',
                ],
              },
              submissions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    files: { type: 'array', items: { type: 'string' } },
                    description: { type: 'string' },
                    submittedAt: { type: 'string', format: 'date-time' },
                    feedback: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        status: {
          type: 'string',
          enum: ['active', 'completed', 'cancelled', 'disputed'],
        },
        approvalWorkflow: {
          type: 'object',
          properties: {
            clientApproved: { type: 'boolean' },
            freelancerApproved: { type: 'boolean' },
            clientApprovedAt: { type: 'string', format: 'date-time' },
            freelancerApprovedAt: { type: 'string', format: 'date-time' },
            approvalOrder: {
              type: 'string',
              enum: ['client_first', 'freelancer_first'],
            },
          },
        },
        pdfUrl: { type: 'string' },
        totalPaid: { type: 'number' },
        totalEscrow: { type: 'number' },
        completedAt: { type: 'string', format: 'date-time' },
        cancellationReason: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not contract participant',
  })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async getContractById(@Param('id') contractId: string, @Request() req) {
    return this.contractsService.getContractById(contractId, req.user.userId);
  }

  @Put(':id/milestones/:milestoneId')
  @ApiOperation({ summary: 'Update milestone' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone ID' })
  @ApiResponse({
    status: 200,
    description: 'Milestone updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Milestone updated successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized' })
  @ApiResponse({ status: 404, description: 'Contract or milestone not found' })
  async updateMilestone(
    @Param('id') contractId: string,
    @Param('milestoneId') milestoneId: string,
    @Request() req,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
  ) {
    return this.contractsService.updateMilestone(
      contractId,
      milestoneId,
      req.user.userId,
      updateMilestoneDto,
    );
  }

  @Post(':id/milestones/:milestoneId/submit')
  @ApiOperation({ summary: 'Submit work for milestone' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone ID' })
  @ApiResponse({
    status: 200,
    description: 'Work submitted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Work submitted successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not the freelancer' })
  async submitMilestoneWork(
    @Param('id') contractId: string,
    @Param('milestoneId') milestoneId: string,
    @Request() req,
    @Body() submitMilestoneDto: SubmitMilestoneDto,
  ) {
    return this.contractsService.submitMilestoneWork(
      contractId,
      milestoneId,
      req.user.userId,
      submitMilestoneDto,
    );
  }

  @Put(':id/milestones/:milestoneId/approve')
  @ApiOperation({ summary: 'Approve milestone work' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone ID' })
  @ApiResponse({
    status: 200,
    description: 'Milestone approved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Milestone approved successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not the client' })
  async approveMilestone(
    @Param('id') contractId: string,
    @Param('milestoneId') milestoneId: string,
    @Request() req,
    @Body() approveMilestoneDto: ApproveMilestoneDto,
  ) {
    return this.contractsService.approveMilestone(
      contractId,
      milestoneId,
      req.user.userId,
      approveMilestoneDto,
    );
  }

  @Get(':id/milestones/:milestoneId/setup-payment')
  @ApiOperation({ summary: 'Setup payment for milestone approval' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment setup information',
    schema: {
      type: 'object',
      properties: {
        hasSavedCards: { type: 'boolean' },
        paymentMethods: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              last4: { type: 'string' },
              brand: { type: 'string' },
              isDefault: { type: 'boolean' }
            }
          }
        },
        setupIntent: {
          type: 'object',
          properties: {
            clientSecret: { type: 'string' },
            id: { type: 'string' }
          }
        },
        requiresSetup: { type: 'boolean' }
      },
    },
  })
  async setupMilestonePayment(
    @Param('id') contractId: string,
    @Param('milestoneId') milestoneId: string,
    @Request() req,
  ) {
    console.log('🔍 Checking payment setup for:', { contractId, milestoneId, userId: req.user.userId });

    // Check if user has saved cards
    const { hasSavedCards } = await this.contractsService.checkUserHasSavedCards(req.user.userId);
    console.log('💳 User payment method status:', { hasSavedCards });

    if (hasSavedCards) {
      // Return saved payment methods
      const paymentMethods = await this.paymentMethodsService.getSavedPaymentMethods(req.user.userId);
      console.log('💳 Returning saved payment methods:', paymentMethods.length);

      return {
        hasSavedCards: true,
        paymentMethods,
        requiresSetup: false
      };
    } else {
      // Initiate payment method setup
      console.log('🔧 Creating setup intent for new payment method');

      const setupIntent = await this.paymentMethodsService.createSetupIntent(req.user.userId);
      console.log('✅ Setup intent created:', setupIntent.id);

      return {
        hasSavedCards: false,
        setupIntent: {
          clientSecret: setupIntent.client_secret,
          id: setupIntent.id
        },
        requiresSetup: true
      };
    }
  }

  @Post(':id/milestones/:milestoneId/reject')
  @ApiOperation({ summary: 'Reject milestone work' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone ID' })
  @ApiResponse({
    status: 200,
    description: 'Milestone rejected successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Milestone rejected successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not the client' })
  async rejectMilestone(
    @Param('id') contractId: string,
    @Param('milestoneId') milestoneId: string,
    @Request() req,
    @Body() rejectMilestoneDto: RejectMilestoneDto,
  ) {
    return this.contractsService.rejectMilestone(
      contractId,
      milestoneId,
      req.user.userId,
      rejectMilestoneDto,
    );
  }

  @Get('payment-methods/default')
  @ApiOperation({ summary: 'Get user default payment method' })
  @ApiResponse({
    status: 200,
    description: 'Default payment method retrieved successfully',
  })
  async getDefaultPaymentMethod(@Request() req) {
    const paymentMethods =
      await this.paymentMethodsService.getSavedPaymentMethods(req.user.userId);
    const defaultMethod = paymentMethods.find((pm) => pm.isDefault);
    return { defaultPaymentMethod: defaultMethod || null };
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract completed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Contract completed successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized' })
  async completeContract(@Param('id') contractId: string, @Request() req) {
    return this.contractsService.completeContract(contractId, req.user.userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Contract cancelled successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Contract cancelled successfully' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized' })
  async cancelContract(
    @Param('id') contractId: string,
    @Request() req,
    @Body() cancelContractDto: CancelContractDto,
  ) {
    return this.contractsService.cancelContract(
      contractId,
      req.user.userId,
      cancelContractDto,
    );
  }

  @Get(':id/download-pdf')
  @ApiOperation({ summary: 'Download contract PDF' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: 200,
    description: 'PDF file download',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized' })
  async downloadContractPDF(
    @Param('id') contractId: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.contractsService.downloadContractPDF(
      contractId,
      req.user.userId,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="contract-${contractId}.pdf"`,
    });

    res.send(pdfBuffer);
  }
}
