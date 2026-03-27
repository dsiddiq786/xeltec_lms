import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { PurchaseRequestsService } from './purchase-requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission, CurrentUser } from '../common/decorators';

@Controller('purchase-requests')
export class PurchaseRequestsController {
    constructor(private readonly service: PurchaseRequestsService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(
        @CurrentUser('sub') userId: string,
        @CurrentUser() user: any,
        @Body() body: {
            course_id: string;
            request_type: 'INDIVIDUAL' | 'BUSINESS';
            business_id?: string;
            seats_requested?: number;
        },
    ) {
        return this.service.create({
            user_id: userId,
            course_id: body.course_id,
            request_type: body.request_type,
            business_id: body.business_id,
            seats_requested: body.seats_requested,
        });
    }

    @Get('mine')
    @UseGuards(JwtAuthGuard)
    async findMine(@CurrentUser('sub') userId: string) {
        return this.service.findMine(userId);
    }

    @Get()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('VIEW_ADMIN_DASHBOARD')
    async findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query('status') status?: string,
    ) {
        return this.service.findAll(Math.max(1, page), Math.min(Math.max(1, limit), 100), status);
    }

    @Patch(':id/approve')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('VIEW_ADMIN_DASHBOARD')
    async approve(
        @Param('id') id: string,
        @CurrentUser('sub') adminUserId: string,
        @Body() body: { approved_price?: number; admin_notes?: string },
    ) {
        return this.service.approve(id, adminUserId, body.approved_price, body.admin_notes);
    }

    @Patch(':id/reject')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('VIEW_ADMIN_DASHBOARD')
    async reject(
        @Param('id') id: string,
        @CurrentUser('sub') adminUserId: string,
        @Body() body: { admin_notes?: string },
    ) {
        return this.service.reject(id, adminUserId, body.admin_notes);
    }
}
