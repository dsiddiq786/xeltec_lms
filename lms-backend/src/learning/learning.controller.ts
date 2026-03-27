import {
    Controller,
    Get,
    Patch,
    Post,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { LearningService } from './learning.service';
import { UpdateProgressDto, SubmitAssessmentDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission, CurrentUser } from '../common/decorators';

@Controller('learning')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LearningController {
    constructor(private readonly learningService: LearningService) { }

    @Get(':enrollmentId')
    @RequirePermission('ACCESS_LEARNING')
    async getLearningState(
        @Param('enrollmentId') enrollmentId: string,
        @CurrentUser('sub') userId: string,
    ) {
        return this.learningService.getLearningState(enrollmentId, userId);
    }

    @Patch(':enrollmentId/progress')
    @RequirePermission('ACCESS_LEARNING')
    async updateProgress(
        @Param('enrollmentId') enrollmentId: string,
        @CurrentUser('sub') userId: string,
        @Body() dto: UpdateProgressDto,
    ) {
        return this.learningService.updateProgress(enrollmentId, userId, dto);
    }

    @Get(':enrollmentId/assessment/questions')
    @RequirePermission('ACCESS_LEARNING')
    async getAssessmentQuestions(
        @Param('enrollmentId') enrollmentId: string,
        @CurrentUser('sub') userId: string,
    ) {
        return this.learningService.getAssessmentQuestions(enrollmentId, userId);
    }

    @Post(':enrollmentId/assessment')
    @RequirePermission('SUBMIT_ASSESSMENT')
    async submitAssessment(
        @Param('enrollmentId') enrollmentId: string,
        @CurrentUser('sub') userId: string,
        @Body() dto: SubmitAssessmentDto,
    ) {
        return this.learningService.submitAssessment(enrollmentId, userId, dto);
    }

    @Get(':enrollmentId/assessment/history')
    @RequirePermission('ACCESS_LEARNING')
    async getAttemptHistory(
        @Param('enrollmentId') enrollmentId: string,
        @CurrentUser('sub') userId: string,
    ) {
        return this.learningService.getAttemptHistory(enrollmentId, userId);
    }
}
