import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentStatus } from '@prisma/client';

@Injectable()
export class EnrollmentService {
    constructor(private readonly prisma: PrismaService) { }

    private async getDefaultStrictMode(): Promise<boolean> {
        const setting = await this.prisma.siteSetting.findUnique({
            where: { key: 'course_player_settings' },
        });
        if (setting && typeof (setting.value as any)?.strict_mode_default === 'boolean') {
            return (setting.value as any).strict_mode_default;
        }
        return true;
    }

    async createEnrollment(
        userId: string,
        courseVersionId: string,
        strictMode?: boolean,
    ) {
        const resolvedStrictMode = strictMode ?? await this.getDefaultStrictMode();
        // Validate version exists
        const version = await this.prisma.courseVersion.findFirst({
            where: { id: courseVersionId, ...PrismaService.notDeleted },
        });
        if (!version) throw new NotFoundException('Course version not found');

        // Check for duplicate enrollment
        const existing = await this.prisma.enrollment.findFirst({
            where: {
                user_id: userId,
                course_version_id: courseVersionId,
                ...PrismaService.notDeleted,
            },
        });
        if (existing) throw new ConflictException('Already enrolled');

        const enrollment = await this.prisma.enrollment.create({
            data: {
                user_id: userId,
                course_version_id: courseVersionId,
                status: EnrollmentStatus.IN_PROGRESS,
                strict_mode: resolvedStrictMode,
                progress: {
                    create: {
                        level_index: 0,
                        module_index: 0,
                        slide_index: 0,
                        progress_percentage: 0,
                    },
                },
            },
            include: { progress: true },
        });

        return enrollment;
    }

    async findByUser(userId: string) {
        return this.prisma.enrollment.findMany({
            where: { user_id: userId, ...PrismaService.notDeleted },
            include: {
                course_version: {
                    include: { course: { select: { id: true, title: true } } },
                },
                progress: true,
                certificate: true,
            },
            orderBy: { created_at: 'desc' },
        });
    }

    async findById(id: string) {
        const enrollment = await this.prisma.enrollment.findFirst({
            where: { id, ...PrismaService.notDeleted },
            include: {
                course_version: true,
                progress: true,
                assessment_attempts: { orderBy: { attempt_number: 'desc' } },
                certificate: true,
            },
        });
        if (!enrollment) throw new NotFoundException('Enrollment not found');
        return enrollment;
    }

    async findByIdForUser(id: string, userId: string) {
        const enrollment = await this.prisma.enrollment.findFirst({
            where: { id, user_id: userId, ...PrismaService.notDeleted },
            include: {
                course_version: true,
                progress: true,
                assessment_attempts: { orderBy: { attempt_number: 'desc' } },
                certificate: true,
            },
        });
        if (!enrollment) throw new NotFoundException('Enrollment not found');
        return enrollment;
    }

    async activeCount() {
        return this.prisma.enrollment.count({
            where: {
                status: EnrollmentStatus.IN_PROGRESS,
                ...PrismaService.notDeleted,
            },
        });
    }

    async completedCount() {
        return this.prisma.enrollment.count({
            where: {
                status: EnrollmentStatus.COMPLETED,
                ...PrismaService.notDeleted,
            },
        });
    }
}
