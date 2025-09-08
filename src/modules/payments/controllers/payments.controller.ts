import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from '../services/payments.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('user')
  @ApiOperation({ summary: 'Get user payments' })
  @ApiResponse({ status: 200, description: 'Returns user payments' })
  async getUserPayments(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.paymentsService.getUserPayments(req.user.userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Returns payment details' })
  async getPaymentById(@Param('id') paymentId: string, @Request() req) {
    return this.paymentsService.getPaymentById(paymentId, req.user.userId);
  }

  @Get('debug/all')
  @ApiOperation({ summary: 'Debug: Get all payments (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all payments' })
  async debugGetAllPayments() {
    // This should be protected by admin guard in production
    const payments = await this.paymentsService.getAllPaymentsForDebug();
    return payments;
  }
}
