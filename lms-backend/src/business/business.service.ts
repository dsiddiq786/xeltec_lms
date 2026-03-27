import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateBusinessDto, InviteEmployeeDto } from './dto';
import { Role, EmployeeStatus } from '@prisma/client';
import * as crypto from 'crypto';

const INVITE_TOKEN_BYTES = 32;
const INVITE_TOKEN_TTL_DAYS = 7;

@Injectable()
export class BusinessService {
    private readonly logger = new Logger(BusinessService.name);
    private readonly frontendUrl: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        private readonly emailService: EmailService,
    ) {
        this.frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:5173');
    }

    async create(dto: CreateBusinessDto, adminUserId: string) {
        return this.prisma.$transaction(async (tx) => {
            const biz = await tx.business.create({
                data: {
                    name: dto.name,
                    owner_id: adminUserId,
                    billing_cycle: dto.billing_cycle,
                    seats_total: dto.seats_total,
                    subscription_status: 'active',
                },
            });

            await tx.user.update({
                where: { id: adminUserId },
                data: { role: Role.BUSINESS_ADMIN },
            });

            await tx.employee.create({
                data: {
                    business_id: biz.id,
                    user_id: adminUserId,
                    status: EmployeeStatus.ACTIVE,
                },
            });

            return biz;
        });
    }

    async findAll(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [businesses, total] = await Promise.all([
            this.prisma.business.findMany({
                where: PrismaService.notDeleted,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: { _count: { select: { employees: true } } },
            }),
            this.prisma.business.count({ where: PrismaService.notDeleted }),
        ]);
        return { data: businesses, total, page, limit };
    }

    async findById(id: string) {
        const biz = await this.prisma.business.findFirst({
            where: { id, ...PrismaService.notDeleted },
            include: {
                employees: {
                    where: PrismaService.notDeleted,
                    include: {
                        user: { select: { id: true, email: true, first_name: true, last_name: true, is_active: true } },
                    },
                },
            },
        });
        if (!biz) throw new NotFoundException('Business not found');
        return biz;
    }

    async findByAdminUser(userId: string) {
        const businessByOwner = await this.prisma.business.findFirst({
            where: {
                owner_id: userId,
                ...PrismaService.notDeleted,
            },
        });
        if (businessByOwner) return this.findById(businessByOwner.id);

        const employee = await this.prisma.employee.findFirst({
            where: {
                user_id: userId,
                status: EmployeeStatus.ACTIVE,
                ...PrismaService.notDeleted,
            },
            include: { business: true },
        });
        if (!employee) throw new NotFoundException('Business not found for user');
        return this.findById(employee.business_id);
    }

    async inviteEmployee(businessId: string, dto: InviteEmployeeDto) {
        return this.prisma.$transaction(async (tx) => {
            const biz = await tx.business.findFirst({
                where: { id: businessId, ...PrismaService.notDeleted },
            });
            if (!biz) throw new NotFoundException('Business not found');

            if (biz.subscription_status === 'past_due') {
                throw new BadRequestException('Cannot invite employees while subscription is past due');
            }
            if (biz.seats_used >= biz.seats_total) {
                throw new BadRequestException('No available seats');
            }

            let user = await tx.user.findUnique({ where: { email: dto.email } });

            if (user) {
                const existing = await tx.employee.findFirst({
                    where: {
                        business_id: businessId,
                        user_id: user.id,
                        ...PrismaService.notDeleted,
                    },
                });
                if (existing) throw new ConflictException('User is already part of this business');
            }

            if (!user) {
                user = await tx.user.create({
                    data: {
                        email: dto.email,
                        password_hash: '!INVITE_PENDING',
                        role: Role.EMPLOYEE,
                    },
                });
            }

            const employee = await tx.employee.create({
                data: {
                    business_id: businessId,
                    user_id: user.id,
                    status: EmployeeStatus.INVITED,
                },
            });

            await tx.business.update({
                where: { id: businessId },
                data: { seats_used: { increment: 1 } },
            });

            const token = crypto.randomBytes(INVITE_TOKEN_BYTES).toString('hex');
            const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

            await tx.inviteToken.create({
                data: {
                    email: dto.email,
                    business_id: businessId,
                    token,
                    expires_at: expiresAt,
                },
            });

            const inviteUrl = `${this.frontendUrl}/accept-invite?token=${token}`;
            this.logger.log(`Invite sent to ${dto.email}. URL: ${inviteUrl}`);

            this.emailService.sendInviteEmail(dto.email, token, biz.name).catch((err) =>
                this.logger.error(`Failed to send invite email: ${err}`),
            );

            return { employee, invite_url: inviteUrl };
        });
    }

    async removeEmployee(businessId: string, employeeId: string) {
        return this.prisma.$transaction(async (tx) => {
            const employee = await tx.employee.findFirst({
                where: {
                    id: employeeId,
                    business_id: businessId,
                    ...PrismaService.notDeleted,
                },
            });
            if (!employee) throw new NotFoundException('Employee not found');

            await tx.employee.update({
                where: { id: employeeId },
                data: {
                    status: EmployeeStatus.DEACTIVATED,
                    deleted_at: new Date(),
                },
            });

            await tx.business.update({
                where: { id: businessId },
                data: { seats_used: { decrement: 1 } },
            });

            return { message: 'Employee removed' };
        });
    }

    async overrideSeats(businessId: string, seatsTotal: number) {
        const biz = await this.prisma.business.findFirst({
            where: { id: businessId, ...PrismaService.notDeleted },
        });
        if (!biz) throw new NotFoundException('Business not found');

        if (seatsTotal < biz.seats_used) {
            throw new BadRequestException(`Cannot reduce seats below current usage (${biz.seats_used})`);
        }

        return this.prisma.business.update({
            where: { id: businessId },
            data: { seats_total: seatsTotal },
        });
    }

    async totalCount() {
        return this.prisma.business.count({ where: PrismaService.notDeleted });
    }

    async activeSubscriptionCount() {
        return this.prisma.business.count({
            where: { subscription_status: 'active', ...PrismaService.notDeleted },
        });
    }

    // ── Per-Course Seat Management ─────────────────────────────

    async purchaseSeats(businessId: string, courseId: string, seatCount: number) {
        const biz = await this.prisma.business.findFirst({
            where: { id: businessId, ...PrismaService.notDeleted },
        });
        if (!biz) throw new NotFoundException('Business not found');

        const course = await this.prisma.course.findFirst({
            where: { id: courseId, is_published: true, deleted_at: null },
        });
        if (!course) throw new NotFoundException('Published course not found');

        const purchase = await this.prisma.businessCoursePurchase.upsert({
            where: { business_id_course_id: { business_id: businessId, course_id: courseId } },
            create: { business_id: businessId, course_id: courseId, seats_purchased: seatCount },
            update: { seats_purchased: { increment: seatCount } },
            include: { course: { select: { id: true, title: true, base_price: true } } },
        });

        return purchase;
    }

    async getCoursePurchases(businessId: string) {
        return this.prisma.businessCoursePurchase.findMany({
            where: { business_id: businessId },
            include: {
                course: {
                    select: { id: true, title: true, base_price: true, thumbnail_url: true, versions: { orderBy: { version_number: 'desc' as const }, take: 1, select: { id: true, version_number: true } } },
                },
            },
            orderBy: { created_at: 'desc' },
        });
    }

    async getCoursePurchase(businessId: string, courseId: string) {
        const purchase = await this.prisma.businessCoursePurchase.findUnique({
            where: { business_id_course_id: { business_id: businessId, course_id: courseId } },
            include: {
                course: {
                    select: { id: true, title: true, base_price: true, thumbnail_url: true, versions: { orderBy: { version_number: 'desc' as const }, take: 1, select: { id: true } } },
                },
            },
        });
        if (!purchase) throw new NotFoundException('Course purchase not found');
        return purchase;
    }

    async assignEmployeeToCourse(businessId: string, courseId: string, employeeEmail: string) {
        const purchase = await this.prisma.businessCoursePurchase.findUnique({
            where: { business_id_course_id: { business_id: businessId, course_id: courseId } },
            include: { course: { include: { versions: { orderBy: { version_number: 'desc' as const }, take: 1 } } } },
        });
        if (!purchase) throw new NotFoundException('Course not purchased');
        if (purchase.seats_assigned >= purchase.seats_purchased) {
            throw new BadRequestException('No available seats');
        }

        const latestVersion = purchase.course.versions[0];
        if (!latestVersion) throw new BadRequestException('Course has no published version');

        const employee = await this.prisma.employee.findFirst({
            where: { business_id: businessId, user: { email: employeeEmail }, ...PrismaService.notDeleted },
            include: { user: true },
        });
        if (!employee) throw new NotFoundException('Employee not found in this business');

        const existingEnrollment = await this.prisma.enrollment.findFirst({
            where: { user_id: employee.user_id, course_version_id: latestVersion.id, deleted_at: null },
        });
        if (existingEnrollment) throw new ConflictException('Employee is already assigned to this course');

        const enrollment = await this.prisma.enrollment.create({
            data: {
                user_id: employee.user_id,
                course_version_id: latestVersion.id,
                status: 'IN_PROGRESS',
                strict_mode: true,
                progress: { create: { level_index: 0, module_index: 0, slide_index: 0, progress_percentage: 0 } },
            },
        });

        await this.prisma.businessCoursePurchase.update({
            where: { id: purchase.id },
            data: { seats_assigned: { increment: 1 } },
        });

        return enrollment;
    }

    async getCourseAssignments(businessId: string, courseId: string) {
        const purchase = await this.prisma.businessCoursePurchase.findUnique({
            where: { business_id_course_id: { business_id: businessId, course_id: courseId } },
            include: { course: { include: { versions: { orderBy: { version_number: 'desc' as const }, take: 1, select: { id: true } } } } },
        });
        if (!purchase) throw new NotFoundException('Course not purchased');

        const versionId = purchase.course.versions[0]?.id;
        if (!versionId) return [];

        const employees = await this.prisma.employee.findMany({
            where: { business_id: businessId, ...PrismaService.notDeleted },
            include: {
                user: {
                    select: {
                        id: true, email: true, first_name: true, last_name: true,
                        enrollments: {
                            where: { course_version_id: versionId, deleted_at: null },
                            include: { progress: true, certificate: true },
                            take: 1,
                        },
                    },
                },
            },
        });

        return employees.map((emp) => ({
            employee_id: emp.id,
            user_id: emp.user.id,
            email: emp.user.email,
            first_name: emp.user.first_name,
            last_name: emp.user.last_name,
            status: emp.status,
            enrollment: emp.user.enrollments[0] || null,
            progress: emp.user.enrollments[0]?.progress || null,
            certificate: emp.user.enrollments[0]?.certificate || null,
        }));
    }

    async unassignEmployeeFromCourse(businessId: string, courseId: string, employeeUserId: string) {
        const purchase = await this.prisma.businessCoursePurchase.findUnique({
            where: { business_id_course_id: { business_id: businessId, course_id: courseId } },
            include: { course: { include: { versions: { orderBy: { version_number: 'desc' as const }, take: 1 } } } },
        });
        if (!purchase) throw new NotFoundException('Course not purchased');

        const versionId = purchase.course.versions[0]?.id;
        if (!versionId) throw new BadRequestException('No version found');

        const enrollment = await this.prisma.enrollment.findFirst({
            where: { user_id: employeeUserId, course_version_id: versionId, deleted_at: null },
            include: { progress: true },
        });
        if (!enrollment) throw new NotFoundException('Assignment not found');

        // Soft-delete the enrollment to restrict access
        await this.prisma.enrollment.update({ where: { id: enrollment.id }, data: { deleted_at: new Date() } });

        // Only return the seat to quota if the employee never started the course
        const hasStarted = enrollment.progress &&
            (enrollment.progress.slide_index > 0 || enrollment.progress.module_index > 0 ||
             enrollment.progress.level_index > 0 || enrollment.progress.progress_percentage > 0);

        if (!hasStarted) {
            await this.prisma.businessCoursePurchase.update({
                where: { id: purchase.id },
                data: { seats_assigned: { decrement: 1 } },
            });
        }

        return {
            message: 'Employee unassigned',
            seat_returned: !hasStarted,
        };
    }

    async getEmployeeCertificates(businessId: string) {
        const employees = await this.prisma.employee.findMany({
            where: { business_id: businessId, ...PrismaService.notDeleted },
            include: {
                user: {
                    select: {
                        id: true, email: true, first_name: true, last_name: true,
                        enrollments: {
                            where: { status: 'COMPLETED', deleted_at: null },
                            include: {
                                certificate: true,
                                course_version: { include: { course: { select: { title: true } } } },
                            },
                        },
                    },
                },
            },
        });

        return employees.flatMap((emp) =>
            emp.user.enrollments
                .filter((e: any) => e.certificate)
                .map((e: any) => ({
                    employee_name: [emp.user.first_name, emp.user.last_name].filter(Boolean).join(' ') || emp.user.email,
                    employee_email: emp.user.email,
                    course_title: e.course_version?.course?.title,
                    certificate_number: e.certificate.certificate_number,
                    issued_at: e.certificate.issued_at,
                })),
        );
    }

    // ── Company Signup Code ──────────────────────────────────

    async generateSignupCode(businessId: string) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
        return this.prisma.business.update({
            where: { id: businessId },
            data: { signup_code: formatted },
            select: { id: true, name: true, signup_code: true },
        });
    }

    async verifySignupCode(code: string) {
        const biz = await this.prisma.business.findFirst({
            where: { signup_code: code.trim().toUpperCase(), ...PrismaService.notDeleted },
            select: { id: true, name: true },
        });
        if (!biz) throw new NotFoundException('Invalid company code');
        return biz;
    }

    async joinViaCode(dto: { company_code: string; email: string; password: string; first_name: string; last_name: string }) {
        const biz = await this.prisma.business.findFirst({
            where: { signup_code: dto.company_code.trim().toUpperCase(), ...PrismaService.notDeleted },
        });
        if (!biz) throw new NotFoundException('Invalid company code');

        const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existingUser) {
            const existingEmployee = await this.prisma.employee.findFirst({
                where: { business_id: biz.id, user_id: existingUser.id, ...PrismaService.notDeleted },
            });
            if (existingEmployee) throw new ConflictException('You are already part of this company');
        }

        const bcrypt = await import('bcrypt');
        const hash = await bcrypt.hash(dto.password, 12);

        return this.prisma.$transaction(async (tx) => {
            let user = existingUser;
            if (!user) {
                user = await tx.user.create({
                    data: {
                        email: dto.email,
                        password_hash: hash,
                        first_name: dto.first_name,
                        last_name: dto.last_name,
                        role: Role.EMPLOYEE,
                    },
                });
            }

            await tx.employee.create({
                data: {
                    business_id: biz.id,
                    user_id: user.id,
                    status: EmployeeStatus.PENDING_APPROVAL,
                },
            });

            this.emailService.send({
                to: biz.owner_id ? (await this.prisma.user.findUnique({ where: { id: biz.owner_id }, select: { email: true } }))?.email || '' : '',
                subject: `New join request for ${biz.name}`,
                html: `<p><strong>${dto.first_name} ${dto.last_name}</strong> (${dto.email}) has requested to join <strong>${biz.name}</strong>.</p><p>Please review this request in your business portal.</p>`,
            }).catch((err) => this.logger.error(`Failed to notify business owner: ${err}`));

            return { message: 'Your request has been submitted. The company admin will review it.' };
        });
    }

    async approveEmployee(businessId: string, employeeId: string) {
        const employee = await this.prisma.employee.findFirst({
            where: { id: employeeId, business_id: businessId, status: EmployeeStatus.PENDING_APPROVAL, ...PrismaService.notDeleted },
            include: { user: { select: { email: true, first_name: true } } },
        });
        if (!employee) throw new NotFoundException('Pending employee not found');

        const biz = await this.prisma.business.findFirst({ where: { id: businessId, ...PrismaService.notDeleted } });
        if (biz && biz.seats_used >= biz.seats_total) {
            throw new BadRequestException('No available seats');
        }

        await this.prisma.$transaction([
            this.prisma.employee.update({ where: { id: employeeId }, data: { status: EmployeeStatus.ACTIVE } }),
            this.prisma.business.update({ where: { id: businessId }, data: { seats_used: { increment: 1 } } }),
        ]);

        this.emailService.send({
            to: employee.user.email,
            subject: `You've been approved to join ${biz?.name || 'the company'}`,
            html: `<p>Hi ${employee.user.first_name || ''},</p><p>Your request to join <strong>${biz?.name}</strong> has been approved! You can now log in and start your training.</p>`,
        }).catch((err) => this.logger.error(`Failed to send approval email: ${err}`));

        return { message: 'Employee approved' };
    }

    async rejectEmployee(businessId: string, employeeId: string) {
        const employee = await this.prisma.employee.findFirst({
            where: { id: employeeId, business_id: businessId, status: EmployeeStatus.PENDING_APPROVAL, ...PrismaService.notDeleted },
        });
        if (!employee) throw new NotFoundException('Pending employee not found');

        await this.prisma.employee.update({
            where: { id: employeeId },
            data: { status: EmployeeStatus.DEACTIVATED, deleted_at: new Date() },
        });

        return { message: 'Employee request rejected' };
    }
}
