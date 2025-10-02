import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto, PaymentMethodResponseDto, PaymentMethodsListResponseDto, SetupIntentResponseDto } from './dto/payment-method.dto';

@ApiTags('Payment Methods')
@ApiBearerAuth()
@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Post('setup-intent')
  @ApiOperation({ summary: 'Create setup intent for payment method collection' })
  @ApiResponse({ status: 201, description: 'Setup intent created successfully', type: SetupIntentResponseDto })
  async createSetupIntent(@CurrentUser('id') userId: string): Promise<SetupIntentResponseDto> {
    return this.paymentMethodsService.createSetupIntent(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Save a new payment method' })
  @ApiResponse({ status: 201, description: 'Payment method saved successfully', type: PaymentMethodResponseDto })
  async save(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreatePaymentMethodDto
  ): Promise<PaymentMethodResponseDto> {
    return this.paymentMethodsService.save(userId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payment methods for the current user' })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved successfully', type: PaymentMethodsListResponseDto })
  async findAll(@CurrentUser('id') userId: string): Promise<PaymentMethodsListResponseDto> {
    return this.paymentMethodsService.findByUserId(userId);
  }

  @Post(':id/default')
  @ApiOperation({ summary: 'Set payment method as default' })
  @ApiResponse({ status: 200, description: 'Payment method set as default successfully' })
  async setDefault(@CurrentUser('id') userId: string, @Param('id') paymentMethodId: string): Promise<void> {
    await this.paymentMethodsService.setDefault(userId, paymentMethodId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a payment method' })
  @ApiResponse({ status: 200, description: 'Payment method deleted successfully' })
  async delete(@CurrentUser('id') userId: string, @Param('id') paymentMethodId: string): Promise<void> {
    await this.paymentMethodsService.delete(userId, paymentMethodId);
  }
}