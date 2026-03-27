import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
    DefaultValuePipe,
    NotFoundException,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto, PublishCourseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators';

@Controller('courses')
export class CoursesController {
    constructor(private readonly coursesService: CoursesService) { }

    // ─── Public endpoints ──────────────────────────────────────

    @Get('catalog')
    async catalog(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query('search') search?: string,
        @Query('category') category?: string,
    ) {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(Math.max(1, limit), 100);
        return this.coursesService.findPublished(safePage, safeLimit, search, category);
    }

    @Get('catalog/:id')
    async catalogDetail(@Param('id') id: string) {
        return this.coursesService.findPublishedById(id);
    }

    @Get('version/:versionId')
    async getVersion(@Param('versionId') versionId: string) {
        return this.coursesService.getVersion(versionId);
    }

    // ─── Admin endpoints ──────────────────────────────────────

    @Get()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('VIEW_ALL_COURSES')
    async findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(Math.max(1, limit), 100);
        return this.coursesService.findAll(safePage, safeLimit);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('VIEW_ALL_COURSES')
    async findOne(@Param('id') id: string) {
        return this.coursesService.findById(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('CREATE_COURSE')
    async create(@Body() dto: CreateCourseDto) {
        return this.coursesService.create(dto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('EDIT_COURSE')
    async update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
        return this.coursesService.update(id, dto);
    }

    @Post(':id/publish')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('COURSE_PUBLISH')
    async publish(@Param('id') id: string, @Body() dto: PublishCourseDto) {
        return this.coursesService.publish(id, dto.content_snapshot);
    }

    @Post(':id/unpublish')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('COURSE_UNPUBLISH')
    async unpublish(@Param('id') id: string) {
        return this.coursesService.unpublish(id);
    }

    @Post('publish-from-draft')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('COURSE_PUBLISH')
    async publishFromDraft(
        @Body() body: {
            draft_id: string;
            title?: string;
            description?: string;
            base_price?: number;
            seat_price?: number;
            thumbnail_url?: string;
            category?: string;
        },
    ) {
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const response = await fetch(`${aiServiceUrl}/api/course-generator/courses/${body.draft_id}`);
        if (!response.ok) throw new NotFoundException('Draft not found in AI service');
        const draftData = await response.json();
        return this.coursesService.publishFromDraft(body.draft_id, draftData, {
            title: body.title,
            description: body.description,
            base_price: body.base_price,
            seat_price: body.seat_price,
            thumbnail_url: body.thumbnail_url,
            category: body.category,
        });
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('DELETE_COURSE')
    async remove(@Param('id') id: string) {
        return this.coursesService.softDelete(id);
    }
}
