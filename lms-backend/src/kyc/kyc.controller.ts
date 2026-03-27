import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
    DefaultValuePipe,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { SubmitKycDto, ReviewKycDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission, CurrentUser } from '../common/decorators';
import { BusinessService } from '../business/business.service';

@ApiTags('KYC')
@ApiBearerAuth()
@Controller('kyc')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class KycController {
    constructor(
        private readonly kycService: KycService,
        private readonly businessService: BusinessService,
    ) {}

    @Post('submit')
    @RequirePermission('MANAGE_BUSINESS')
    @ApiOperation({ summary: 'Submit or update KYC for my business' })
    async submit(
        @CurrentUser('sub') userId: string,
        @Body() dto: SubmitKycDto,
    ) {
        const biz = await this.businessService.findByAdminUser(userId);
        const businessId = Array.isArray(biz) ? biz[0]?.id : (biz as any)?.id;
        return this.kycService.submitOrUpdate(businessId, dto);
    }

    @Get('my')
    @RequirePermission('MANAGE_BUSINESS')
    @ApiOperation({ summary: 'Get my business KYC status' })
    async getMyKyc(@CurrentUser('sub') userId: string) {
        const biz = await this.businessService.findByAdminUser(userId);
        const businessId = Array.isArray(biz) ? biz[0]?.id : (biz as any)?.id;
        return this.kycService.getForBusiness(businessId);
    }

    @Post('documents')
    @RequirePermission('MANAGE_BUSINESS')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload a KYC document' })
    async uploadDocument(
        @CurrentUser('sub') userId: string,
        @UploadedFile() file: Express.Multer.File,
        @Body('document_type') documentType: string,
    ) {
        if (!file) throw new BadRequestException('File is required');
        if (!documentType) throw new BadRequestException('document_type is required');
        const biz = await this.businessService.findByAdminUser(userId);
        const businessId = Array.isArray(biz) ? biz[0]?.id : (biz as any)?.id;
        return this.kycService.uploadDocument(businessId, file.buffer, file.originalname, documentType);
    }

    @Get('admin/pending')
    @RequirePermission('REVIEW_KYC')
    @ApiOperation({ summary: 'List pending KYC reviews (admin)' })
    async listPending(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        return this.kycService.listPending(page, Math.min(limit, 100));
    }

    @Get('admin/all')
    @RequirePermission('REVIEW_KYC')
    @ApiOperation({ summary: 'List all KYC submissions (admin)' })
    async listAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        return this.kycService.listAll(page, Math.min(limit, 100));
    }

    @Patch('admin/:businessId/review')
    @RequirePermission('REVIEW_KYC')
    @ApiOperation({ summary: 'Review (approve/reject) KYC (admin)' })
    async review(
        @Param('businessId') businessId: string,
        @Body() dto: ReviewKycDto,
        @CurrentUser('sub') adminUserId: string,
    ) {
        return this.kycService.review(businessId, dto, adminUserId);
    }
}
