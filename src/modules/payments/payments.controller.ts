import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { PaymentService } from './payments.service';
import { TransactionLogService } from './transaction-log.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFilters } from '../../common/filters/payment.filters';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly transactionLogService: TransactionLogService,
  ) {}

  @Post()
  @Roles(UserRole.CLIENT, UserRole.FREELANCER)
  async create(@Body() createPaymentDto: CreatePaymentDto, @CurrentUser() user) {
    return this.paymentService.create(createPaymentDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CLIENT, UserRole.FREELANCER)
  async findAll(
    @Query() filters: PaymentFilters,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return this.paymentService.findAll(filters, page, limit, sortBy, sortOrder);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CLIENT, UserRole.FREELANCER)
  async findOne(@Param('id') id: string) {
    return this.paymentService.findById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateData: any) {
    return this.paymentService.updateById(id, updateData);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.paymentService.deleteById(id);
    return { message: 'Payment deleted successfully' };
  }

  // Payment action endpoints
  @Patch(':id/process')
  @Roles(UserRole.ADMIN)
  async processPayment(@Param('id') id: string) {
    return this.paymentService.processPayment(id);
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN)
  async completePayment(
    @Param('id') id: string,
    @Body() body: { stripePaymentIntentId: string; stripeChargeId?: string; stripeTransferId?: string; stripeFee?: number }
  ) {
    return this.paymentService.completePayment(
      id,
      body.stripePaymentIntentId,
      body.stripeChargeId,
      body.stripeTransferId,
      body.stripeFee
    );
  }

  @Patch(':id/fail')
  @Roles(UserRole.ADMIN)
  async failPayment(
    @Param('id') id: string,
    @Body() body: { errorMessage: string }
  ) {
    return this.paymentService.failPayment(id, body.errorMessage);
  }

  @Patch(':id/refund')
  @Roles(UserRole.ADMIN)
  async refundPayment(
    @Param('id') id: string,
    @Body() body: { refundAmount?: number }
  ) {
    return this.paymentService.refundPayment(id, body.refundAmount);
  }

  @Patch(':id/retry')
  @Roles(UserRole.ADMIN)
  async retryPayment(@Param('id') id: string) {
    return this.paymentService.retryPayment(id);
  }

  // Payment query endpoints
  @Get('contract/:contractId')
  @Roles(UserRole.ADMIN, UserRole.CLIENT, UserRole.FREELANCER)
  async findByContract(@Param('contractId') contractId: string) {
    return this.paymentService.findByContractId(contractId);
  }

  @Get('contract/:contractId/total')
  @Roles(UserRole.ADMIN, UserRole.CLIENT, UserRole.FREELANCER)
  async getTotalPaidByContract(@Param('contractId') contractId: string) {
    const total = await this.paymentService.getTotalPaidByContract(contractId);
    return { total };
  }

  @Get('stats/user/:userId/:userType')
  @Roles(UserRole.ADMIN, UserRole.CLIENT, UserRole.FREELANCER)
  async getPaymentStats(
    @Param('userId') userId: string,
    @Param('userType') userType: 'payer' | 'payee',
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    const dateRange = startDate && endDate ? { start: new Date(startDate), end: new Date(endDate) } : undefined;
    return this.paymentService.getPaymentStats(userId, userType, dateRange);
  }

  // Transaction log endpoints
  @Get('transactions/logs')
  @Roles(UserRole.ADMIN)
  async getTransactionLogs(
    @Query() filters: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return this.transactionLogService.findAll(filters, page, limit, sortBy, sortOrder);
  }

  @Get('transactions/:id')
  @Roles(UserRole.ADMIN)
  async getTransactionLog(@Param('id') id: string) {
    return this.transactionLogService.findById(id);
  }

  @Get('transactions/by-transaction-id/:transactionId')
  @Roles(UserRole.ADMIN)
  async getTransactionByTransactionId(@Param('transactionId') transactionId: string) {
    return this.transactionLogService.findByTransactionId(transactionId);
  }

  @Get('transactions/user/:userId')
  @Roles(UserRole.ADMIN, UserRole.CLIENT, UserRole.FREELANCER)
  async getUserTransactions(
    @Param('userId') userId: string,
    @Query('type') type: 'from' | 'to' | 'both' = 'both',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.transactionLogService.findByUserId(userId, type, page, limit);
  }

  @Get('transactions/:userId/summary')
  @Roles(UserRole.ADMIN, UserRole.CLIENT, UserRole.FREELANCER)
  async getUserTransactionSummary(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    const dateRange = startDate && endDate ? { start: new Date(startDate), end: new Date(endDate) } : undefined;
    return this.transactionLogService.getUserTransactionSummary(userId, dateRange);
  }

  @Get('transactions/related/:relatedId/:relatedType')
  @Roles(UserRole.ADMIN, UserRole.CLIENT, UserRole.FREELANCER)
  async getTransactionsByRelatedEntity(
    @Param('relatedId') relatedId: string,
    @Param('relatedType') relatedType: 'contract' | 'milestone' | 'withdrawal' | 'dispute',
  ) {
    return this.transactionLogService.findByRelatedEntity(relatedId, relatedType);
  }

  @Get('transactions/recent')
  @Roles(UserRole.ADMIN, UserRole.CLIENT, UserRole.FREELANCER)
  async getRecentTransactions(
    @Query('limit') limit: number = 10,
    @Query('userId') userId?: string,
  ) {
    return this.transactionLogService.getRecentTransactions(limit, userId);
  }

  @Get('transactions/date-range')
  @Roles(UserRole.ADMIN)
  async getTransactionsByDateRange(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.transactionLogService.getTransactionsByDateRange(
      new Date(startDate),
      new Date(endDate),
      groupBy
    );
  }

  @Get('transactions/pending')
  @Roles(UserRole.ADMIN)
  async getPendingTransactions() {
    return this.transactionLogService.getPendingTransactions();
  }

  @Get('transactions/failed')
  @Roles(UserRole.ADMIN)
  async getFailedTransactions(@Query('limit') limit?: number) {
    return this.transactionLogService.getFailedTransactions(limit);
  }

  @Get('transactions/volume-stats')
  @Roles(UserRole.ADMIN)
  async getTransactionVolumeStats(
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    const dateRange = startDate && endDate ? { start: new Date(startDate), end: new Date(endDate) } : undefined;
    return this.transactionLogService.getTransactionVolumeStats(dateRange);
  }

  @Get('transactions/search')
  @Roles(UserRole.ADMIN)
  async searchTransactions(
    @Query('term') searchTerm: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.transactionLogService.searchTransactions(searchTerm, page, limit);
  }

  // Transaction log action endpoints
  @Patch('transactions/:id/status')
  @Roles(UserRole.ADMIN)
  async updateTransactionStatus(
    @Param('id') id: string,
    @Body() body: { status: 'pending' | 'completed' | 'failed' | 'cancelled'; stripeId?: string; errorMessage?: string }
  ) {
    return this.transactionLogService.updateById(id, {
      status: body.status,
      stripeId: body.stripeId,
      errorMessage: body.errorMessage,
    });
  }

  @Patch('transactions/by-transaction-id/:transactionId/status')
  @Roles(UserRole.ADMIN)
  async updateTransactionStatusByTransactionId(
    @Param('transactionId') transactionId: string,
    @Body() body: { status: 'pending' | 'completed' | 'failed' | 'cancelled'; stripeId?: string; errorMessage?: string }
  ) {
    return this.transactionLogService.updateByTransactionId(transactionId, {
      status: body.status,
      stripeId: body.stripeId,
      errorMessage: body.errorMessage,
    });
  }

  @Patch('transactions/mark-completed/:transactionId')
  @Roles(UserRole.ADMIN)
  async markTransactionCompleted(
    @Param('transactionId') transactionId: string,
    @Body() body: { stripeId?: string }
  ) {
    return this.transactionLogService.markAsCompleted(transactionId, body.stripeId);
  }

  @Patch('transactions/mark-failed/:transactionId')
  @Roles(UserRole.ADMIN)
  async markTransactionFailed(
    @Param('transactionId') transactionId: string,
    @Body() body: { errorMessage?: string }
  ) {
    return this.transactionLogService.markAsFailed(transactionId, body.errorMessage);
  }

  @Post('transactions/bulk-update-status')
  @Roles(UserRole.ADMIN)
  async bulkUpdateTransactionStatus(
    @Body() body: { transactionIds: string[]; status: 'pending' | 'completed' | 'failed' | 'cancelled' }
  ) {
    return this.transactionLogService.bulkUpdateStatus(body.transactionIds, body.status);
  }

  @Delete('transactions/:id')
  @Roles(UserRole.ADMIN)
  async deleteTransactionLog(@Param('id') id: string) {
    await this.transactionLogService.deleteById(id);
    return { message: 'Transaction log deleted successfully' };
  }

  // User balance endpoint
  @Get('balance/:userId')
  @Roles(UserRole.ADMIN, UserRole.CLIENT, UserRole.FREELANCER)
  async getUserBalance(@Param('userId') userId: string) {
    return this.transactionLogService.getTransactionBalance(userId);
  }
}
