import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto, UpdateCourseDto } from './dto';

@Injectable()
export class CoursesService {
    constructor(private readonly prisma: PrismaService) { }

    // ─── CRUD ──────────────────────────────────────────────────

    async create(dto: CreateCourseDto) {
        return this.prisma.course.create({
            data: {
                title: dto.title,
                description: dto.description,
                base_price: dto.base_price,
            },
        });
    }

    async findAll(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [courses, total] = await Promise.all([
            this.prisma.course.findMany({
                where: PrismaService.notDeleted,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    versions: {
                        orderBy: { version_number: 'desc' },
                        take: 1,
                        select: { id: true, version_number: true, created_at: true },
                    },
                },
            }),
            this.prisma.course.count({ where: PrismaService.notDeleted }),
        ]);
        return { data: courses, total, page, limit };
    }

    async findById(id: string) {
        const course = await this.prisma.course.findFirst({
            where: { id, ...PrismaService.notDeleted },
            include: {
                versions: {
                    where: PrismaService.notDeleted,
                    orderBy: { version_number: 'desc' },
                },
            },
        });
        if (!course) throw new NotFoundException('Course not found');
        return course;
    }

    async findPublished(
        page = 1,
        limit = 20,
        search?: string,
        category?: string,
    ) {
        const skip = (page - 1) * limit;
        const where: any = { is_published: true, ...PrismaService.notDeleted };

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (category) {
            where.category = category;
        }

        const [courses, total] = await Promise.all([
            this.prisma.course.findMany({
                where,
                skip,
                take: limit,
                orderBy: { published_at: 'desc' },
                include: {
                    versions: {
                        orderBy: { version_number: 'desc' },
                        take: 1,
                        select: { id: true, version_number: true },
                    },
                },
            }),
            this.prisma.course.count({ where }),
        ]);
        return { data: courses, total, page, limit };
    }

    async findPublishedById(id: string) {
        const course = await this.prisma.course.findFirst({
            where: { id, is_published: true, ...PrismaService.notDeleted },
            include: {
                versions: {
                    where: PrismaService.notDeleted,
                    orderBy: { version_number: 'desc' },
                    take: 1,
                },
            },
        });
        if (!course) throw new NotFoundException('Course not found');
        return course;
    }

    async update(id: string, dto: UpdateCourseDto) {
        const course = await this.prisma.course.findFirst({
            where: { id, ...PrismaService.notDeleted },
        });
        if (!course) throw new NotFoundException('Course not found');

        return this.prisma.course.update({
            where: { id },
            data: dto,
        });
    }

    async softDelete(id: string) {
        const course = await this.prisma.course.findFirst({
            where: { id, ...PrismaService.notDeleted },
        });
        if (!course) throw new NotFoundException('Course not found');

        return this.prisma.course.update({
            where: { id },
            data: { deleted_at: new Date(), is_published: false },
        });
    }

    // ─── PUBLISH / UNPUBLISH (Phase 3) ────────────────────────

    /**
     * Publishing creates an immutable CourseVersion snapshot.
     * Enrollments always link to a version, never the course directly.
     */
    async publish(id: string, contentSnapshot: Record<string, any>) {
        const course = await this.prisma.course.findFirst({
            where: { id, ...PrismaService.notDeleted },
        });
        if (!course) throw new NotFoundException('Course not found');

        // Determine next version number
        const latestVersion = await this.prisma.courseVersion.findFirst({
            where: { course_id: id },
            orderBy: { version_number: 'desc' },
        });
        const nextVersion = latestVersion ? latestVersion.version_number + 1 : 1;

        // Create immutable version + mark course published
        const [version] = await this.prisma.$transaction([
            this.prisma.courseVersion.create({
                data: {
                    course_id: id,
                    version_number: nextVersion,
                    content_snapshot: contentSnapshot,
                },
            }),
            this.prisma.course.update({
                where: { id },
                data: { is_published: true, published_at: new Date() },
            }),
        ]);

        return version;
    }

    async unpublish(id: string) {
        const course = await this.prisma.course.findFirst({
            where: { id, ...PrismaService.notDeleted },
        });
        if (!course) throw new NotFoundException('Course not found');
        if (!course.is_published) {
            throw new BadRequestException('Course is not published');
        }

        return this.prisma.course.update({
            where: { id },
            data: { is_published: false },
        });
    }

    async getVersion(versionId: string) {
        const version = await this.prisma.courseVersion.findFirst({
            where: { id: versionId, ...PrismaService.notDeleted },
            include: { course: { select: { title: true, id: true } } },
        });
        if (!version) throw new NotFoundException('Course version not found');
        return version;
    }

    async publishFromDraft(
        draftId: string,
        draftData: any,
        overrides?: {
            title?: string;
            description?: string;
            base_price?: number;
            seat_price?: number;
            thumbnail_url?: string;
            category?: string;
        },
    ) {
        const existingCourse = await this.prisma.course.findFirst({
            where: { source_draft_id: draftId, ...PrismaService.notDeleted },
        });

        if (existingCourse) {
            throw new BadRequestException('This draft has already been published');
        }

        // Draft data from AI service wraps content under draftData.content
        const content = draftData.content || draftData;
        const meta = draftData.metadata || {};

        const title = overrides?.title || content.title || meta.title || draftData.course_title || 'Untitled Course';
        const description = overrides?.description || content.description || meta.description || `AI-generated course: ${title}`;
        const category = overrides?.category || meta.category || content.category || null;
        const difficulty = meta.course_level || content.course_level || null;

        const levels = content.levels || draftData.levels || [];
        const assessment = content.assessment || draftData.assessment;

        const contentSnapshot = {
            levels: levels.map((level: any) => ({
                title: level.level_title || level.title,
                modules: (level.modules || []).map((mod: any) => ({
                    title: mod.module_title || mod.title,
                    slides: (mod.slides || []).map((slide: any) => ({
                        title: slide.slide_title || slide.title,
                        content: slide.slide_text || slide.content || '',
                        text: slide.slide_text || slide.content || '',
                        image_url: slide.image_url || null,
                        audio_url: slide.voiceover_audio_url || slide.audio_url || null,
                        voiceover_script: slide.voiceover_script || null,
                        visual_prompt: slide.visual_prompt || null,
                        type: slide.slide_type || slide.type || 'content',
                        estimated_duration_sec: slide.estimated_duration_sec || 30,
                        video_url: slide.video_url || null,
                        asset_type: slide.asset_type || 'image',
                        question: slide.quiz_question || slide.question || null,
                        options: slide.quiz_options || slide.options || null,
                        correct_option: slide.quiz_correct_index ?? slide.correct_option ?? null,
                        quiz_explanation: slide.quiz_explanation || null,
                    })),
                })),
            })),
            assessment: assessment ? {
                questions: (assessment.questions || []).map((q: any, idx: number) => ({
                    id: q.id || `q_${idx}`,
                    question: q.question,
                    options: q.options,
                    correct_option: q.correct_option ?? q.correct_answer ?? q.correct_option_index ?? 0,
                })),
                pass_percentage: assessment.pass_percentage || 85,
            } : undefined,
        };

        const course = await this.prisma.course.create({
            data: {
                title,
                description,
                base_price: overrides?.base_price ?? 0,
                seat_price: overrides?.seat_price ?? null,
                thumbnail_url: overrides?.thumbnail_url ?? null,
                category,
                difficulty_level: difficulty,
                is_published: true,
                published_at: new Date(),
                source_type: 'ai_generator',
                source_draft_id: draftId,
                versions: {
                    create: {
                        version_number: 1,
                        content_snapshot: contentSnapshot,
                    },
                },
            },
            include: { versions: true },
        });

        return course;
    }

    async totalCount() {
        return this.prisma.course.count({ where: PrismaService.notDeleted });
    }

    async publishedCount() {
        return this.prisma.course.count({
            where: { is_published: true, ...PrismaService.notDeleted },
        });
    }
}
