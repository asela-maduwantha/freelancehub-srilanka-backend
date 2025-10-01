import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { ProcessWithdrawalDto } from './dto/process-withdrawal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ForbiddenException } from '@nestjs/common';

@Controller('withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post()
  @Roles(UserRole.FREELANCER)
  async create(@Body() createWithdrawalDto: CreateWithdrawalDto, @CurrentUser() user) {
    // Override userId with authenticated user
    createWithdrawalDto.userId = user._id;
    return this.withdrawalsService.create(createWithdrawalDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.FREELANCER)
  async findAll(@CurrentUser() user, @Query('userId') userId?: string) {
    // Freelancers can only see their own withdrawals, admins can see all
    const targetUserId = user.role === UserRole.ADMIN ? userId : user._id.toString();
    return this.withdrawalsService.findAll(targetUserId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.FREELANCER)
  async findOne(@Param('id') id: string, @CurrentUser() user) {
    const withdrawal = await this.withdrawalsService.findById(id);

    // Check if user has permission to view this withdrawal
    if (user.role !== UserRole.ADMIN && withdrawal.freelancerId.toString() !== user._id.toString()) {
      throw new ForbiddenException('Access denied');
    }

    return withdrawal;
  }

  @Patch(':id/process')
  @Roles(UserRole.ADMIN)
  async processWithdrawal(
    @Param('id') id: string,
    @Body() processDto: ProcessWithdrawalDto
  ) {
    return this.withdrawalsService.processWithdrawal(id, processDto);
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN)
  async completeWithdrawal(@Param('id') id: string) {
    return this.withdrawalsService.completeWithdrawal(id);
  }

  @Patch(':id/fail')
  @Roles(UserRole.ADMIN)
  async failWithdrawal(
    @Param('id') id: string,
    @Body() body: { errorMessage: string }
  ) {
    return this.withdrawalsService.failWithdrawal(id, body.errorMessage);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    // Soft delete - mark as cancelled
    const withdrawal = await this.withdrawalsService.findById(id);
    if (withdrawal.status === 'pending') {
      await this.withdrawalsService.failWithdrawal(id, 'Cancelled by admin');
    }
    return { message: 'Withdrawal cancelled successfully' };
  }
}