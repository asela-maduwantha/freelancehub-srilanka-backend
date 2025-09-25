import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
  Res,
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
import { Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Throttle } from '@nestjs/throttler';
import { ContractsService } from './contracts.service';
import {
  CreateContractDto,
  ContractQueryDto,
  ContractResponseDto,
  ContractListResponseDto,
  UpdateContractStatusDto,
} from './dto';
import { PaginationDto } from '../../common/dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Contracts')
@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
@ApiBearerAuth()
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @Roles(UserRole.CLIENT)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 contract creations per minute
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new contract from a proposal' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Contract created successfully',
    type: ContractResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Proposal or job not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid data or unauthorized access',
  })
  async createContract(
    @Body(ValidationPipe) createContractDto: CreateContractDto,
    @CurrentUser('id') clientId: string,
  ): Promise<ContractResponseDto> {
    const contract = await this.contractsService.createContract(createContractDto, clientId);
    return {
      success: true,
      message: 'Contract created successfully',
      data: contract,
    };
  }

  @Post(':id/start')
  @Roles(UserRole.CLIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a contract (client only)' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contract started successfully',
    type: ContractResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  async startContract(
    @Param('id') contractId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ContractResponseDto> {
    const contract = await this.contractsService.startContract(contractId, userId);
    return {
      success: true,
      message: 'Contract started successfully',
      data: contract,
    };
  }

  @Post(':id/sign')
  @Roles(UserRole.FREELANCER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign contract as freelancer' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contract signed successfully',
    type: ContractResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  async signContract(
    @Param('id') contractId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ContractResponseDto> {
    const contract = await this.contractsService.freelancerSignContract(contractId, userId);
    return {
      success: true,
      message: 'Contract signed successfully',
      data: contract,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get contracts for current user' })
  @ApiQuery({ type: ContractQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contracts retrieved successfully',
    type: ContractListResponseDto,
  })
  async getContractsForUser(
    @Query(new ValidationPipe({ transform: true })) query: ContractQueryDto,
    @CurrentUser('id') userId: string,
  ): Promise<ContractListResponseDto> {
    const result = await this.contractsService.getContractsForUser(userId, query);
    return {
      success: true,
      data: {
        contracts: result.data,
        pagination: {
          page: result.pagination.page,
          limit: result.pagination.limit,
          total: result.pagination.total,
          pages: result.pagination.totalPages,
        },
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contract by ID' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contract retrieved successfully',
    type: ContractResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  async getContractById(
    @Param('id') contractId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ContractResponseDto> {
    const contract = await this.contractsService.getContractById(contractId, userId);
    return {
      success: true,
      message: 'Contract retrieved successfully',
      data: contract,
    };
  }

  @Post(':id/complete')
  @Roles(UserRole.CLIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a contract (client only)' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contract completed successfully',
    type: ContractResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid contract status',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  async completeContract(
    @Param('id') contractId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ContractResponseDto> {
    const contract = await this.contractsService.completeContract(contractId, userId);
    return {
      success: true,
      message: 'Contract completed successfully',
      data: contract,
    };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a contract' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contract cancelled successfully',
    type: ContractResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  async cancelContract(
    @Param('id') contractId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ContractResponseDto> {
    const contract = await this.contractsService.cancelContract(contractId, userId);
    return {
      success: true,
      message: 'Contract cancelled successfully',
      data: contract,
    };
  }

  @Get(':id/download')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 PDF downloads per minute
  @ApiOperation({ summary: 'Download contract as PDF' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PDF generated successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract or related data not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  async downloadContract(
    @Param('id') contractId: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.contractsService.downloadContract(contractId, userId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="contract-${contractId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}