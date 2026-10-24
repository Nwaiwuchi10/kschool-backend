import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('monnify/initialize')
  @ApiOperation({ summary: 'Initialize a Monnify payment transaction' })
  async initializeMonnify(
    @Request() req: any,
    @Body() body: { packageId: string; redirectUrl?: string },
  ) {
    return this.paymentsService.initializePayment(req.user, body.packageId, body.redirectUrl);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('monnify/verify')
  @ApiOperation({ summary: 'Verify Monnify payment and activate subscription' })
  async verifyMonnify(
    @Request() req: any,
    @Body() body: { reference: string; packageId?: string },
  ) {
    return this.paymentsService.verifyPayment(body.reference, req.user.id, body.packageId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Monnify / Payment Webhook Endpoint' })
  async handleWebhook(
    @Body() body: any,
    @Headers('monnify-signature') monnifySig?: string,
    @Headers('x-paystack-signature') paystackSig?: string,
  ) {
    const signature = monnifySig || paystackSig || '';
    return this.paymentsService.handleWebhook(body, signature);
  }
}
