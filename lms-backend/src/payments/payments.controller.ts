import {
    Controller,
    Post,
    Get,
    Body,
    Req,
    Query,
    UseGuards,
    ParseIntPipe,
    DefaultValuePipe,
    Headers,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission, CurrentUser } from '../common/decorators';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('checkout')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('ENROLL_SELF')
    async createCheckout(
        @CurrentUser('sub') userId: string,
        @Body() dto: CreateCheckoutDto,
    ) {
        return this.paymentsService.createCheckoutSession(
            userId,
            dto.course_version_id,
            dto.success_url,
            dto.cancel_url,
        );
    }

    /**
     * Stripe webhook — no auth guard, validated by signature.
     * Must use raw body for signature verification.
     */
    @SkipThrottle()
    @Post('webhook')
    async handleWebhook(
        @Req() req: any,
        @Headers('stripe-signature') signature: string,
    ) {
        return this.paymentsService.handleWebhook(req.rawBody!, signature);
    }

    @Get('transactions')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('VIEW_ALL_TRANSACTIONS')
    async findAllTransactions(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(Math.max(1, limit), 100);
        return this.paymentsService.findAllTransactions(safePage, safeLimit);
    }
}
