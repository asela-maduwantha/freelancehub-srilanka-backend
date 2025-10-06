import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ============= DASHBOARD & STATISTICS =============
  
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  async getAdminDashboard() {
    return this.adminService.getAdminDashboard();
  }

  @Get('statistics')
  @HttpCode(HttpStatus.OK)
  async getPlatformStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getPlatformStatistics(startDate, endDate);
  }

  @Get('revenue/analytics')
  @HttpCode(HttpStatus.OK)
  async getRevenueAnalytics(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getRevenueAnalytics(period, startDate, endDate);
  }

  @Get('system/health')
  @HttpCode(HttpStatus.OK)
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  // ============= USER MANAGEMENT =============

  @Get('users')
  @HttpCode(HttpStatus.OK)
  async getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return this.adminService.getAllUsers(page, limit, role, status, search, sortBy, sortOrder);
  }

  @Get('users/:id')
  @HttpCode(HttpStatus.OK)
  async getUserDetails(@Param('id') id: string) {
    return this.adminService.getUserDetails(id);
  }

  @Patch('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @Param('id') id: string,
    @Body() body: { reason: string; duration?: number },
  ) {
    return this.adminService.suspendUser(id, body.reason, body.duration);
  }

  @Patch('users/:id/activate')
  @HttpCode(HttpStatus.OK)
  async activateUser(@Param('id') id: string) {
    return this.adminService.activateUser(id);
  }

  @Patch('users/:id/verify')
  @HttpCode(HttpStatus.OK)
  async verifyUser(@Param('id') id: string) {
    return this.adminService.verifyUser(id);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.adminService.deleteUser(id, body.reason);
  }

  @Get('users/statistics/overview')
  @HttpCode(HttpStatus.OK)
  async getUserStatistics() {
    return this.adminService.getUserStatistics();
  }

  // ============= PAYMENT MANAGEMENT =============

  @Get('payments')
  @HttpCode(HttpStatus.OK)
  async getAllPayments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return this.adminService.getAllPayments(page, limit, status, startDate, endDate, sortBy, sortOrder);
  }

  @Get('payments/failed')
  @HttpCode(HttpStatus.OK)
  async getFailedPayments(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.adminService.getFailedPayments(page, limit);
  }

  @Get('payments/statistics')
  @HttpCode(HttpStatus.OK)
  async getPaymentStatistics() {
    return this.adminService.getPaymentStatistics();
  }

  @Patch('payments/:id/refund')
  @HttpCode(HttpStatus.OK)
  async refundPayment(
    @Param('id') id: string,
    @Body() body: { reason: string; amount?: number },
  ) {
    return this.adminService.refundPayment(id, body.reason, body.amount);
  }

  // ============= WITHDRAWAL MANAGEMENT =============

  @Get('withdrawals')
  @HttpCode(HttpStatus.OK)
  async getAllWithdrawals(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllWithdrawals(page, limit, status);
  }

  @Get('withdrawals/pending')
  @HttpCode(HttpStatus.OK)
  async getPendingWithdrawals() {
    return this.adminService.getPendingWithdrawals();
  }

  @Get('withdrawals/statistics')
  @HttpCode(HttpStatus.OK)
  async getWithdrawalStatistics() {
    return this.adminService.getWithdrawalStatistics();
  }

  // Note: Withdrawal approve/reject handled in withdrawals controller

  // ============= JOB MANAGEMENT =============

  @Get('jobs')
  @HttpCode(HttpStatus.OK)
  async getAllJobs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('flagged') flagged?: boolean,
  ) {
    return this.adminService.getAllJobs(page, limit, status, flagged);
  }

  @Patch('jobs/:id/flag')
  @HttpCode(HttpStatus.OK)
  async flagJob(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.adminService.flagJob(id, body.reason);
  }

  @Patch('jobs/:id/unflag')
  @HttpCode(HttpStatus.OK)
  async unflagJob(@Param('id') id: string) {
    return this.adminService.unflagJob(id);
  }

  @Delete('jobs/:id')
  @HttpCode(HttpStatus.OK)
  async deleteJob(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.adminService.deleteJob(id, body.reason);
  }

  // ============= CONTRACT MANAGEMENT =============

  @Get('contracts')
  @HttpCode(HttpStatus.OK)
  async getAllContracts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllContracts(page, limit, status);
  }

  @Get('contracts/statistics')
  @HttpCode(HttpStatus.OK)
  async getContractStatistics() {
    return this.adminService.getContractStatistics();
  }

  @Patch('contracts/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelContract(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.adminService.cancelContract(id, body.reason);
  }

  // ============= PROPOSAL MANAGEMENT =============

  @Get('proposals')
  @HttpCode(HttpStatus.OK)
  async getAllProposals(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllProposals(page, limit, status);
  }

  // ============= DISPUTE MANAGEMENT =============

  @Get('disputes')
  @HttpCode(HttpStatus.OK)
  async getAllDisputes(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllDisputes(page, limit, status);
  }

  @Get('disputes/pending')
  @HttpCode(HttpStatus.OK)
  async getPendingDisputes() {
    return this.adminService.getPendingDisputes();
  }

  @Patch('disputes/:id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveDispute(
    @Param('id') id: string,
    @Body() body: { resolution: string; favoredParty: string; refundAmount?: number },
  ) {
    return this.adminService.resolveDispute(id, body.resolution, body.favoredParty, body.refundAmount);
  }

  @Patch('disputes/:id/escalate')
  @HttpCode(HttpStatus.OK)
  async escalateDispute(@Param('id') id: string, @Body() body: { notes?: string }) {
    return this.adminService.escalateDispute(id, body.notes);
  }

  // ============= REVIEW MANAGEMENT =============

  @Get('reviews')
  @HttpCode(HttpStatus.OK)
  async getAllReviews(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('flagged') flagged?: boolean,
  ) {
    return this.adminService.getAllReviews(page, limit, flagged);
  }

  @Patch('reviews/:id/flag')
  @HttpCode(HttpStatus.OK)
  async flagReview(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.adminService.flagReview(id, body.reason);
  }

  @Delete('reviews/:id')
  @HttpCode(HttpStatus.OK)
  async deleteReview(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.adminService.deleteReview(id, body.reason);
  }

  // ============= REPORTS & ANALYTICS =============

  @Get('reports/users')
  @HttpCode(HttpStatus.OK)
  async getUsersReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('format') format: 'json' | 'csv' = 'json',
  ) {
    return this.adminService.getUsersReport(startDate, endDate, format);
  }

  @Get('reports/revenue')
  @HttpCode(HttpStatus.OK)
  async getRevenueReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('format') format: 'json' | 'csv' = 'json',
  ) {
    return this.adminService.getRevenueReport(startDate, endDate, format);
  }

  @Get('reports/transactions')
  @HttpCode(HttpStatus.OK)
  async getTransactionsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('format') format: 'json' | 'csv' = 'json',
  ) {
    return this.adminService.getTransactionsReport(startDate, endDate, format);
  }

  // ============= SETTINGS & CONFIGURATION =============

  @Get('settings/platform')
  @HttpCode(HttpStatus.OK)
  async getPlatformSettings() {
    return this.adminService.getPlatformSettings();
  }

  @Put('settings/platform')
  @HttpCode(HttpStatus.OK)
  async updatePlatformSettings(@Body() settings: any) {
    return this.adminService.updatePlatformSettings(settings);
  }

  @Get('settings/fees')
  @HttpCode(HttpStatus.OK)
  async getFeeSettings() {
    return this.adminService.getFeeSettings();
  }

  @Put('settings/fees')
  @HttpCode(HttpStatus.OK)
  async updateFeeSettings(@Body() fees: any) {
    return this.adminService.updateFeeSettings(fees);
  }

  // ============= ACTIVITY LOGS =============

  @Get('logs/activities')
  @HttpCode(HttpStatus.OK)
  async getActivityLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getActivityLogs(page, limit, userId, action, startDate, endDate);
  }

  @Get('logs/errors')
  @HttpCode(HttpStatus.OK)
  async getErrorLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('severity') severity?: string,
  ) {
    return this.adminService.getErrorLogs(page, limit, severity);
  }
}
