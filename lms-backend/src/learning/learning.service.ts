import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CertificatesService } from '../certificates/certificates.service';
import { EmailService } from '../email/email.service';
import { EnrollmentStatus } from '@prisma/client';
import { UpdateProgressDto, SubmitAssessmentDto } from './dto';

const ASSESSMENT_COOLDOWN_SECONDS = 3600;
const PASSING_SCORE = 70;

interface AssessmentQuestion {
    id: string;
    question: string;
    options: string[];
    correct_option: number;
}

interface ContentSnapshot {
    levels?: Array<{
        modules?: Array<{
            slides?: unknown[];
        }>;
    }>;
    assessment?: {
        questions?: AssessmentQuestion[];
    };
}

@Injectable()
export class LearningService {
    private readonly logger = new Logger(LearningService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
        private readonly certificatesService: CertificatesService,
        private readonly emailService: EmailService,
    ) {}

    async getLearningState(enrollmentId: string, userId: string) {
        const enrollment = await this.getEnrollmentForUser(enrollmentId, userId);

        return {
            enrollment_id: enrollment.id,
            status: enrollment.status,
            strict_mode: enrollment.strict_mode,
            progress: enrollment.progress,
            course_version: enrollment.course_version,
        };
    }

    async updateProgress(enrollmentId: string, userId: string, dto: UpdateProgressDto) {
        const enrollment = await this.getEnrollmentForUser(enrollmentId, userId);

        const progress = enrollment.progress;
        if (!progress) throw new NotFoundException('Progress record not found');

        const snapshot = enrollment.course_version.content_snapshot as ContentSnapshot;

        if (enrollment.strict_mode && enrollment.status !== EnrollmentStatus.COMPLETED) {
            this.validateStrictProgression(progress, dto, snapshot);
        }

        const totalSlides = this.countTotalSlides(snapshot);
        const currentSlideNumber = this.slideNumberFromIndices(dto, snapshot);
        const percentage = totalSlides > 0
            ? Math.min(100, Math.round((currentSlideNumber / totalSlides) * 100))
            : 0;

        return this.prisma.progress.update({
            where: { id: progress.id },
            data: {
                level_index: dto.level_index,
                module_index: dto.module_index,
                slide_index: dto.slide_index,
                progress_percentage: percentage,
                last_accessed_at: new Date(),
            },
        });
    }

    async submitAssessment(enrollmentId: string, userId: string, dto: SubmitAssessmentDto) {
        const enrollment = await this.getEnrollmentForUser(enrollmentId, userId);

        if (enrollment.strict_mode) {
            const progress = enrollment.progress;
            if (!progress || progress.progress_percentage < 100) {
                throw new ForbiddenException('Must complete all slides before taking the assessment');
            }
        }

        const cooldownKey = `assessment_cooldown:${enrollmentId}`;
        const cooldownActive = await this.redis.exists(cooldownKey);
        if (cooldownActive) {
            const ttl = await this.redis.ttl(cooldownKey);
            throw new BadRequestException(
                `Assessment cooldown active. Try again in ${Math.ceil(ttl / 60)} minutes`,
            );
        }

        const snapshot = enrollment.course_version.content_snapshot as ContentSnapshot;
        const score = this.computeScore(dto.answers, snapshot);

        const lastAttempt = await this.prisma.assessmentAttempt.findFirst({
            where: { enrollment_id: enrollmentId },
            orderBy: { attempt_number: 'desc' },
        });
        const attemptNumber = (lastAttempt?.attempt_number ?? 0) + 1;

        const passed = score >= PASSING_SCORE;

        const attempt = await this.prisma.assessmentAttempt.create({
            data: {
                enrollment_id: enrollmentId,
                score,
                passed,
                attempt_number: attemptNumber,
                answers: dto.answers as any,
            },
        });

        await this.redis.set(cooldownKey, '1', ASSESSMENT_COOLDOWN_SECONDS);

        let certificateNumber: string | null = null;
        if (passed) {
            await this.prisma.enrollment.update({
                where: { id: enrollmentId },
                data: {
                    status: EnrollmentStatus.COMPLETED,
                    strict_mode: false,
                },
            });

            try {
                const cert = await this.certificatesService.generateCertificate(enrollmentId);
                certificateNumber = cert.certificate_number;

                const courseTitle = enrollment.course_version?.course?.title ?? 'Course';
                const userEmail = enrollment.user?.email;
                if (userEmail && certificateNumber) {
                    this.emailService.sendCertificateNotification(userEmail, courseTitle, certificateNumber).catch((err) =>
                        this.logger.error(`Failed to send certificate email: ${err}`),
                    );
                }
            } catch {
                // Certificate may already exist; non-fatal
            }
        }

        return {
            ...attempt,
            passed,
            certificate_number: certificateNumber,
            message: passed
                ? 'Congratulations! You passed the assessment.'
                : `Score: ${score}%. You need ${PASSING_SCORE}% to pass. Try again after cooldown.`,
        };
    }

    async getAttemptHistory(enrollmentId: string, userId: string) {
        await this.getEnrollmentForUser(enrollmentId, userId);
        return this.prisma.assessmentAttempt.findMany({
            where: { enrollment_id: enrollmentId },
            orderBy: { attempt_number: 'desc' },
        });
    }

    async getAssessmentQuestions(enrollmentId: string, userId: string) {
        const enrollment = await this.getEnrollmentForUser(enrollmentId, userId);

        if (enrollment.strict_mode) {
            const progress = enrollment.progress;
            if (!progress || progress.progress_percentage < 100) {
                throw new ForbiddenException('Must complete all slides before taking the assessment');
            }
        }

        const snapshot = enrollment.course_version.content_snapshot as ContentSnapshot;
        const questions = snapshot?.assessment?.questions;
        if (!questions || questions.length === 0) {
            throw new BadRequestException('No assessment questions configured');
        }

        return questions.map((q) => ({
            id: q.id,
            question: q.question,
            options: q.options,
        }));
    }

    private computeScore(
        answers: Array<{ question_id: string; selected_option: number }>,
        snapshot: ContentSnapshot,
    ): number {
        const questions = snapshot?.assessment?.questions;
        if (!questions || questions.length === 0) {
            throw new BadRequestException('This course has no assessment questions configured');
        }

        const questionMap = new Map(questions.map((q) => [q.id, q]));
        let correct = 0;

        for (const answer of answers) {
            const question = questionMap.get(answer.question_id);
            if (question && question.correct_option === answer.selected_option) {
                correct++;
            }
        }

        return Math.round((correct / questions.length) * 100);
    }

    private async getEnrollmentForUser(enrollmentId: string, userId: string) {
        const enrollment = await this.prisma.enrollment.findFirst({
            where: {
                id: enrollmentId,
                user_id: userId,
                ...PrismaService.notDeleted,
            },
            include: {
                progress: true,
                course_version: { include: { course: true } },
                user: true,
            },
        });

        if (!enrollment) throw new NotFoundException('Enrollment not found');
        return enrollment;
    }

    private validateStrictProgression(
        current: { level_index: number; module_index: number; slide_index: number },
        target: UpdateProgressDto,
        snapshot: ContentSnapshot,
    ) {
        if (
            target.level_index === current.level_index &&
            target.module_index === current.module_index &&
            target.slide_index === current.slide_index
        ) {
            return;
        }

        const currentNum = this.slideNumberFromIndices(current, snapshot);
        const targetNum = this.slideNumberFromIndices(target, snapshot);

        if (targetNum < currentNum) return;

        if (targetNum > currentNum + 1) {
            throw new ForbiddenException('Cannot skip slides in strict mode. Complete current slide first.');
        }
    }

    private countTotalSlides(snapshot: ContentSnapshot): number {
        if (!snapshot?.levels) return 0;
        let count = 0;
        for (const level of snapshot.levels) {
            if (Array.isArray(level.modules)) {
                for (const mod of level.modules) {
                    count += Array.isArray(mod.slides) ? mod.slides.length : 0;
                }
            }
        }
        return count;
    }

    private slideNumberFromIndices(
        indices: { level_index: number; module_index: number; slide_index: number },
        snapshot: ContentSnapshot,
    ): number {
        if (!snapshot?.levels) return 0;
        let count = 0;
        for (let l = 0; l < snapshot.levels.length; l++) {
            const level = snapshot.levels[l];
            if (!Array.isArray(level.modules)) continue;
            for (let m = 0; m < level.modules.length; m++) {
                const mod = level.modules[m];
                const slideCount = Array.isArray(mod.slides) ? mod.slides.length : 0;
                if (l === indices.level_index && m === indices.module_index) {
                    return count + indices.slide_index + 1;
                }
                count += slideCount;
            }
        }
        return count;
    }
}
