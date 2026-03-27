import {
    Controller,
    Get,
    Post,
    Delete,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { CreateBusinessDto, InviteEmployeeDto, OverrideSeatsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission, CurrentUser } from '../common/decorators';

const MAX_PAGE_LIMIT = 100;

@ApiTags('Business')
@ApiBearerAuth()
@Controller('businesses')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class BusinessController {
    constructor(private readonly businessService: BusinessService) {}

    @Get()
    @RequirePermission('MANAGE_ALL_BUSINESSES')
    @ApiOperation({ summary: 'List all businesses (admin)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(Math.max(1, limit), MAX_PAGE_LIMIT);
        return this.businessService.findAll(safePage, safeLimit);
    }

    @Get(':id')
    @RequirePermission('MANAGE_ALL_BUSINESSES')
    @ApiOperation({ summary: 'Get business by ID (admin)' })
    async findOne(@Param('id') id: string) {
        return this.businessService.findById(id);
    }

    @Patch(':id/seats')
    @RequirePermission('MANAGE_ALL_BUSINESSES')
    @ApiOperation({ summary: 'Override seat count (admin)' })
    async overrideSeats(
        @Param('id') id: string,
        @Body() dto: OverrideSeatsDto,
    ) {
        return this.businessService.overrideSeats(id, dto.seats_total);
    }

    @Post()
    @RequirePermission('ENROLL_SELF')
    @ApiOperation({ summary: 'Register a new business' })
    async create(
        @Body() dto: CreateBusinessDto,
        @CurrentUser('sub') userId: string,
    ) {
        return this.businessService.create(dto, userId);
    }

    @Get('my/business')
    @RequirePermission('MANAGE_BUSINESS')
    @ApiOperation({ summary: 'Get my business details' })
    async getMyBusiness(@CurrentUser('sub') userId: string) {
        return this.businessService.findByAdminUser(userId);
    }

    @Get('my/employees')
    @RequirePermission('VIEW_BUSINESS_EMPLOYEES')
    @ApiOperation({ summary: 'List my business employees' })
    async getEmployees(@CurrentUser('sub') userId: string) {
        const biz = await this.businessService.findByAdminUser(userId);
        return biz.employees;
    }

    @Post('my/employees/invite')
    @RequirePermission('INVITE_EMPLOYEE')
    @ApiOperation({ summary: 'Invite an employee to my business' })
    async inviteEmployee(
        @CurrentUser('sub') userId: string,
        @Body() dto: InviteEmployeeDto,
    ) {
        const biz = await this.businessService.findByAdminUser(userId);
        return this.businessService.inviteEmployee(biz.id, dto);
    }

    @Delete('my/employees/:employeeId')
    @RequirePermission('REMOVE_EMPLOYEE')
    @ApiOperation({ summary: 'Remove an employee from my business' })
    async removeEmployee(
        @CurrentUser('sub') userId: string,
        @Param('employeeId') employeeId: string,
    ) {
        const biz = await this.businessService.findByAdminUser(userId);
        return this.businessService.removeEmployee(biz.id, employeeId);
    }

    @Post('my/employees/:employeeId/approve')
    @RequirePermission('MANAGE_BUSINESS')
    @ApiOperation({ summary: 'Approve a pending employee join request' })
    async approveEmployee(
        @CurrentUser('sub') userId: string,
        @Param('employeeId') employeeId: string,
    ) {
        const biz = await this.businessService.findByAdminUser(userId);
        return this.businessService.approveEmployee(biz.id, employeeId);
    }

    @Post('my/employees/:employeeId/reject')
    @RequirePermission('MANAGE_BUSINESS')
    @ApiOperation({ summary: 'Reject a pending employee join request' })
    async rejectEmployee(
        @CurrentUser('sub') userId: string,
        @Param('employeeId') employeeId: string,
    ) {
        const biz = await this.businessService.findByAdminUser(userId);
        return this.businessService.rejectEmployee(biz.id, employeeId);
    }

    @Post('my/signup-code')
    @RequirePermission('MANAGE_BUSINESS')
    @ApiOperation({ summary: 'Generate a signup code for my business' })
    async generateSignupCode(@CurrentUser('sub') userId: string) {
        const biz = await this.businessService.findByAdminUser(userId);
        return this.businessService.generateSignupCode(biz.id);
    }

    // ── Per-Course Seat Management ─────────────────────────────

    @Post('my/courses/:courseId/purchase')
    @RequirePermission('MANAGE_BUSINESS')
    @ApiOperation({ summary: 'Purchase seats for a course' })
    async purchaseSeats(
        @CurrentUser('sub') userId: string,
        @Param('courseId') courseId: string,
        @Body() body: { seats: number },
    ) {
        const biz = await this.businessService.findByAdminUser(userId);
        const businessId = Array.isArray(biz) ? biz[0]?.id : (biz as any)?.id;
        return this.businessService.purchaseSeats(businessId, courseId, body.seats);
    }

    @Get('my/courses')
    @RequirePermission('MANAGE_BUSINESS')
    @ApiOperation({ summary: 'List my purchased courses with seat info' })
    async getMyCoursePurchases(@CurrentUser('sub') userId: string) {
        const biz = await this.businessService.findByAdminUser(userId);
        const businessId = Array.isArray(biz) ? biz[0]?.id : (biz as any)?.id;
        return this.businessService.getCoursePurchases(businessId);
    }

    @Get('my/courses/:courseId/assignments')
    @RequirePermission('MANAGE_BUSINESS')
    @ApiOperation({ summary: 'Get employee assignments for a purchased course' })
    async getCourseAssignments(
        @CurrentUser('sub') userId: string,
        @Param('courseId') courseId: string,
    ) {
        const biz = await this.businessService.findByAdminUser(userId);
        const businessId = Array.isArray(biz) ? biz[0]?.id : (biz as any)?.id;
        const purchase = await this.businessService.getCoursePurchase(businessId, courseId);
        const assignments = await this.businessService.getCourseAssignments(businessId, courseId);
        return { purchase, assignments };
    }

    @Post('my/courses/:courseId/assign')
    @RequirePermission('MANAGE_BUSINESS')
    @ApiOperation({ summary: 'Assign an employee to a course seat' })
    async assignEmployee(
        @CurrentUser('sub') userId: string,
        @Param('courseId') courseId: string,
        @Body() body: { email: string },
    ) {
        const biz = await this.businessService.findByAdminUser(userId);
        const businessId = Array.isArray(biz) ? biz[0]?.id : (biz as any)?.id;
        return this.businessService.assignEmployeeToCourse(businessId, courseId, body.email);
    }

    @Delete('my/courses/:courseId/assign/:employeeUserId')
    @RequirePermission('MANAGE_BUSINESS')
    @ApiOperation({ summary: 'Unassign an employee from a course seat' })
    async unassignEmployee(
        @CurrentUser('sub') userId: string,
        @Param('courseId') courseId: string,
        @Param('employeeUserId') employeeUserId: string,
    ) {
        const biz = await this.businessService.findByAdminUser(userId);
        const businessId = Array.isArray(biz) ? biz[0]?.id : (biz as any)?.id;
        return this.businessService.unassignEmployeeFromCourse(businessId, courseId, employeeUserId);
    }

    @Get('my/certificates')
    @RequirePermission('MANAGE_BUSINESS')
    @ApiOperation({ summary: 'List certificates earned by employees' })
    async getEmployeeCertificates(@CurrentUser('sub') userId: string) {
        const biz = await this.businessService.findByAdminUser(userId);
        const businessId = Array.isArray(biz) ? biz[0]?.id : (biz as any)?.id;
        return this.businessService.getEmployeeCertificates(businessId);
    }
}
