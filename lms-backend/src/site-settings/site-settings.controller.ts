import { Controller, Get, Put, Post, Body, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SiteSettingsService } from './site-settings.service';
import { StorageService } from '../storage/storage.service';
import { EmailService } from '../email/email.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators';

@ApiTags('Site Settings')
@Controller('site-settings')
export class SiteSettingsController {
    constructor(
        private readonly siteSettingsService: SiteSettingsService,
        private readonly storageService: StorageService,
        private readonly emailService: EmailService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Get all site settings (public)' })
    async getAll() {
        return this.siteSettingsService.getAll();
    }

    @Get(':key')
    @ApiOperation({ summary: 'Get a specific site setting (public)' })
    async getByKey(@Param('key') key: string) {
        return this.siteSettingsService.get(key);
    }

    @Post('test-email')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('VIEW_ADMIN_DASHBOARD')
    @ApiOperation({ summary: 'Send a test email (admin)' })
    async sendTestEmail(@Body() body: { to: string }) {
        await this.emailService.send({
            to: body.to,
            subject: 'Test email from brickSkill',
            html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#212121;">
                <div style="text-align:center;margin-bottom:32px;">
                    <span style="display:inline-block;width:36px;height:36px;border-radius:8px;background:#035A51;color:#CBFF2A;font-weight:900;font-size:16px;line-height:36px;">b</span>
                    <span style="font-size:18px;font-weight:700;margin-left:8px;">brickSkill</span>
                </div>
                <div style="background:#f9fafb;border-radius:12px;padding:32px 24px;">
                    <h2 style="margin:0 0 12px">Test Email</h2>
                    <p>If you're reading this, your email configuration is working correctly!</p>
                    <p style="color:#999;font-size:12px;margin-top:16px">Sent from the brickSkill admin panel.</p>
                </div>
            </body></html>`,
        });
        return { message: 'Test email sent' };
    }

    @Post('upload')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('VIEW_ADMIN_DASHBOARD')
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Upload an asset (admin)' })
    async uploadAsset(@UploadedFile() file: Express.Multer.File) {
        const url = await this.storageService.upload(file.buffer, file.originalname, 'site-assets');
        return { url };
    }

    @Put()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('VIEW_ADMIN_DASHBOARD')
    @ApiOperation({ summary: 'Update site settings (admin)' })
    async updateMany(@Body() body: Record<string, any>) {
        return this.siteSettingsService.upsertMany(body);
    }

    @Put(':key')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('VIEW_ADMIN_DASHBOARD')
    @ApiOperation({ summary: 'Update a specific site setting (admin)' })
    async update(@Param('key') key: string, @Body() body: { value: any }) {
        return this.siteSettingsService.upsert(key, body.value);
    }
}
