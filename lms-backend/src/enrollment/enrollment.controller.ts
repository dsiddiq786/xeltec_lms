import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission, CurrentUser } from '../common/decorators';

@ApiTags('Enrollment')
@ApiBearerAuth()
@Controller('enrollments')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class EnrollmentController {
    constructor(private readonly enrollmentService: EnrollmentService) {}

    @Get()
    @RequirePermission('VIEW_OWN_ENROLLMENTS')
    @ApiOperation({ summary: 'List my enrollments' })
    async findMine(@CurrentUser('sub') userId: string) {
        return this.enrollmentService.findByUser(userId);
    }

    @Get(':id')
    @RequirePermission('VIEW_OWN_ENROLLMENTS')
    @ApiOperation({ summary: 'Get enrollment by ID (ownership enforced)' })
    async findOne(
        @Param('id') id: string,
        @CurrentUser('sub') userId: string,
    ) {
        return this.enrollmentService.findByIdForUser(id, userId);
    }

    @Post()
    @RequirePermission('ENROLL_SELF')
    @ApiOperation({ summary: 'Enroll in a course' })
    async enroll(
        @CurrentUser('sub') userId: string,
        @Body() dto: CreateEnrollmentDto,
    ) {
        return this.enrollmentService.createEnrollment(
            userId,
            dto.course_version_id,
            dto.strict_mode ?? true,
        );
    }
}
