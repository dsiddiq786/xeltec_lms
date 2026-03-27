import {
    Injectable,
    BadRequestException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentService } from '../enrollment/enrollment.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class PurchaseRequestsService {
    private readonly logger = new Logger(PurchaseRequestsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly enrollmentService: EnrollmentService,
        private readonly emailService: EmailService,
    ) {}

    async create(dto: {
        user_id: string;
        business_id?: string;
        course_id: string;
        request_type: 'INDIVIDUAL' | 'BUSINESS';
        seats_requested?: number;
    }) {
        const course = await this.prisma.course.findFirst({
            where: { id: dto.course_id, is_published: true, ...PrismaService.notDeleted },
            include: {
                versions: { orderBy: { version_number: 'desc' }, take: 1 },
            },
        });

        if (!course) throw new NotFoundException('Course not found');
        if (!course.versions.length) throw new BadRequestException('Course has no published version');

        const existingPending = await this.prisma.purchaseRequest.findFirst({
            where: {
                user_id: dto.user_id,
                course_id: dto.course_id,
                status: 'PENDING',
            },
        });
        if (existingPending) {
            throw new BadRequestException('You already have a pending request for this course');
        }

        const price = dto.request_type === 'BUSINESS' && course.seat_price
            ? Number(course.seat_price)
            : Number(course.base_price);

        return this.prisma.purchaseRequest.create({
            data: {
                user_id: dto.user_id,
                business_id: dto.business_id || null,
                course_id: dto.course_id,
                course_version_id: course.versions[0].id,
                request_type: dto.request_type,
                seats_requested: dto.seats_requested || 1,
                original_price: price,
            },
            include: {
                course: { select: { id: true, title: true, thumbnail_url: true } },
            },
        });
    }

    async findMine(userId: string) {
        return this.prisma.purchaseRequest.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            include: {
                course: { select: { id: true, title: true, thumbnail_url: true, base_price: true, seat_price: true } },
            },
        });
    }

    async findAll(page = 1, limit = 20, status?: string) {
        const skip = (page - 1) * limit;
        const where: any = {};
        if (status) where.status = status;

        const [data, total] = await Promise.all([
            this.prisma.purchaseRequest.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    user: { select: { id: true, email: true, first_name: true, last_name: true, role: true } },
                    business: { select: { id: true, name: true } },
                    course: { select: { id: true, title: true, thumbnail_url: true, base_price: true, seat_price: true } },
                },
            }),
            this.prisma.purchaseRequest.count({ where }),
        ]);
        return { data, total, page, limit };
    }

    async approve(
        requestId: string,
        adminUserId: string,
        approvedPrice?: number,
        adminNotes?: string,
    ) {
        const request = await this.prisma.purchaseRequest.findUnique({
            where: { id: requestId },
            include: {
                user: true,
                course: { include: { versions: { orderBy: { version_number: 'desc' }, take: 1 } } },
                business: true,
            },
        });

        if (!request) throw new NotFoundException('Purchase request not found');
        if (request.status !== 'PENDING') throw new BadRequestException('Request already processed');

        const finalPrice = approvedPrice ?? Number(request.original_price);

        await this.prisma.purchaseRequest.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED',
                approved_price: finalPrice,
                admin_notes: adminNotes || null,
                reviewed_by: adminUserId,
                reviewed_at: new Date(),
            },
        });

        if (request.request_type === 'INDIVIDUAL') {
            try {
                await this.enrollmentService.createEnrollment(
                    request.user_id,
                    request.course_version_id,
                );
            } catch (err) {
                this.logger.warn(`Enrollment creation may be duplicate: ${err}`);
            }

            await this.prisma.transaction.create({
                data: {
                    user_id: request.user_id,
                    stripe_event_id: `manual_${requestId}`,
                    amount: finalPrice,
                    status: 'completed',
                },
            });
        } else if (request.request_type === 'BUSINESS' && request.business_id) {
            const existing = await this.prisma.businessCoursePurchase.findUnique({
                where: {
                    business_id_course_id: {
                        business_id: request.business_id,
                        course_id: request.course_id,
                    },
                },
            });

            if (existing) {
                await this.prisma.businessCoursePurchase.update({
                    where: { id: existing.id },
                    data: { seats_purchased: existing.seats_purchased + request.seats_requested },
                });
            } else {
                await this.prisma.businessCoursePurchase.create({
                    data: {
                        business_id: request.business_id,
                        course_id: request.course_id,
                        seats_purchased: request.seats_requested,
                    },
                });
            }

            await this.prisma.transaction.create({
                data: {
                    business_id: request.business_id,
                    stripe_event_id: `manual_biz_${requestId}`,
                    amount: finalPrice * request.seats_requested,
                    status: 'completed',
                },
            });
        }

        try {
            await this.emailService.sendPurchaseConfirmation(
                request.user.email,
                request.course.title,
            );
        } catch (err) {
            this.logger.warn(`Failed to send approval email: ${err}`);
        }

        return { message: 'Request approved' };
    }

    async reject(requestId: string, adminUserId: string, adminNotes?: string) {
        const request = await this.prisma.purchaseRequest.findUnique({
            where: { id: requestId },
            include: { user: true, course: true },
        });

        if (!request) throw new NotFoundException('Purchase request not found');
        if (request.status !== 'PENDING') throw new BadRequestException('Request already processed');

        await this.prisma.purchaseRequest.update({
            where: { id: requestId },
            data: {
                status: 'REJECTED',
                admin_notes: adminNotes || null,
                reviewed_by: adminUserId,
                reviewed_at: new Date(),
            },
        });

        try {
            await this.emailService.sendPurchaseRejection(
                request.user.email,
                request.course.title,
                adminNotes,
            );
        } catch (err) {
            this.logger.warn(`Failed to send rejection email: ${err}`);
        }

        return { message: 'Request rejected' };
    }
}
