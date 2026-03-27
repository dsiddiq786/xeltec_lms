import {
    Controller,
    Get,
    Post,
    Param,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission, CurrentUser } from '../common/decorators';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
    constructor(private readonly certificatesService: CertificatesService) {}

    @Get('verify/:certificateNumber')
    @ApiOperation({ summary: 'Public certificate verification' })
    async verify(@Param('certificateNumber') certificateNumber: string) {
        return this.certificatesService.verifyCertificate(certificateNumber);
    }

    @Get('download/:certificateNumber')
    @ApiOperation({ summary: 'Download certificate PDF (public)' })
    async downloadPdf(
        @Param('certificateNumber') certificateNumber: string,
        @Res() res: Response,
    ) {
        const buffer = await this.certificatesService.generatePdf(certificateNumber);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="certificate-${certificateNumber}.pdf"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }

    @Get('my')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('VIEW_OWN_CERTIFICATES')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List my certificates' })
    async findMyCertificates(@CurrentUser('sub') userId: string) {
        return this.certificatesService.findByUser(userId);
    }

    @Post('generate/:enrollmentId')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('VIEW_OWN_CERTIFICATES')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Generate certificate for my enrollment (ownership enforced)' })
    async generate(
        @Param('enrollmentId') enrollmentId: string,
        @CurrentUser('sub') userId: string,
    ) {
        return this.certificatesService.generateCertificateForUser(enrollmentId, userId);
    }
}
