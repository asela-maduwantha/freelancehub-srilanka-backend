import {
  Controller,
  Post,
  Headers,
  Request,
  RawBodyRequest,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { StripeConnectService } from '../services/stripe-connect.service';

@ApiTags('webhooks')
@Controller('payments/stripe')
export class StripeWebhookController {
  constructor(
    private readonly stripeConnectService: StripeConnectService,
  ) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Request() req: RawBodyRequest<Request>,
  ) {
    const body = req.rawBody;
    if (!body) {
      throw new Error('Raw body not available');
    }
    return this.stripeConnectService.handleStripeWebhook(signature, body);
  }
}
