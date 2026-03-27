import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get('dashboard')
    @RequirePermission('VIEW_ADMIN_DASHBOARD')
    async getDashboard() {
        return this.adminService.getDashboardStats();
    }

    @Get('reporting')
    @RequirePermission('VIEW_ADMIN_DASHBOARD')
    async getReporting() {
        return this.adminService.getReportingData();
    }

    @Get('certificates')
    @RequirePermission('VIEW_ADMIN_DASHBOARD')
    async getAllCertificates() {
        return this.adminService.getAllCertificates();
    }

    @Get('notifications')
    @RequirePermission('VIEW_ADMIN_DASHBOARD')
    async getNotifications(@Query('limit') limit?: string) {
        return this.adminService.getRecentNotifications(parseInt(limit || '10', 10));
    }
}
