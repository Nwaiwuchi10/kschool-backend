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
  @Post('paystack/initialize')
  @ApiOperation({ summary: 'Initialize a Paystack payment transaction' })
  async initializePaystack(
    @Request() req: any,
    @Body() body: { packageId: string; callbackUrl?: string; redirectUrl?: string; classLevel?: string },
  ) {
    return this.paymentsService.initializePayment(
      req.user,
      body.packageId,
      body.callbackUrl || body.redirectUrl,
      body.classLevel,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('paystack/verify')
  @ApiOperation({ summary: 'Verify Paystack payment and activate subscription' })
  async verifyPaystack(
    @Request() req: any,
    @Body() body: { reference: string; packageId?: string; classLevel?: string },
  ) {
    return this.paymentsService.verifyPayment(
      body.reference,
      req.user.id || req.user._id,
      body.packageId,
      body.classLevel,
    );
  }

  // Backward compatibility alias for monnify endpoints to prevent any breaking changes
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('monnify/initialize')
  @ApiOperation({ summary: 'Alias initialize payment (Paystack)' })
  async initializeMonnify(
    @Request() req: any,
    @Body() body: { packageId: string; redirectUrl?: string; classLevel?: string },
  ) {
    return this.paymentsService.initializePayment(
      req.user,
      body.packageId,
      body.redirectUrl,
      body.classLevel,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('monnify/verify')
  @ApiOperation({ summary: 'Alias verify payment (Paystack)' })
  async verifyMonnify(
    @Request() req: any,
    @Body() body: { reference: string; packageId?: string; classLevel?: string },
  ) {
    return this.paymentsService.verifyPayment(
      body.reference,
      req.user.id || req.user._id,
      body.packageId,
      body.classLevel,
    );
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paystack Payment Webhook Endpoint' })
  async handleWebhook(
    @Body() body: any,
    @Headers('x-paystack-signature') paystackSig?: string,
    @Headers('monnify-signature') monnifySig?: string,
  ) {
    const signature = paystackSig || monnifySig || '';
    return this.paymentsService.handleWebhook(body, signature);
  }
}
