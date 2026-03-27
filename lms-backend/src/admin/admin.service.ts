import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CoursesService } from '../courses/courses.service';
import { BusinessService } from '../business/business.service';
import { EnrollmentService } from '../enrollment/enrollment.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class AdminService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly usersService: UsersService,
        private readonly coursesService: CoursesService,
        private readonly businessService: BusinessService,
        private readonly enrollmentService: EnrollmentService,
        private readonly paymentsService: PaymentsService,
    ) {}

    async getDashboardStats() {
        const [
            totalUsers,
            totalBusinesses,
            activeEnrollments,
            completedEnrollments,
            totalRevenue,
            activeSubscriptions,
            totalCourses,
            publishedCourses,
            certificatesIssued,
        ] = await Promise.all([
            this.usersService.totalCount(),
            this.businessService.totalCount(),
            this.enrollmentService.activeCount(),
            this.enrollmentService.completedCount(),
            this.paymentsService.totalRevenue(),
            this.businessService.activeSubscriptionCount(),
            this.coursesService.totalCount(),
            this.coursesService.publishedCount(),
            this.prisma.certificate.count({ where: { deleted_at: null } }),
        ]);

        const totalEnrollments = activeEnrollments + completedEnrollments;

        return {
            totalUsers,
            totalBusinesses,
            activeEnrollments,
            completedEnrollments,
            totalEnrollments,
            totalRevenue,
            activeSubscriptions,
            totalCourses,
            publishedCourses,
            certificatesIssued,
        };
    }

    async getReportingData() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
            enrollmentsLast30d,
            enrollmentsLast7d,
            revenueThisMonth,
            topCourses,
            kycPending,
            assessmentAttempts,
            avgScore,
        ] = await Promise.all([
            this.prisma.enrollment.count({ where: { created_at: { gte: thirtyDaysAgo }, deleted_at: null } }),
            this.prisma.enrollment.count({ where: { created_at: { gte: sevenDaysAgo }, deleted_at: null } }),
            this.prisma.transaction.aggregate({
                _sum: { amount: true },
                where: {
                    status: 'paid',
                    created_at: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
                    deleted_at: null,
                },
            }),
            this.prisma.enrollment.groupBy({
                by: ['course_version_id'],
                _count: { id: true },
                where: { deleted_at: null },
                orderBy: { _count: { id: 'desc' } },
                take: 5,
            }),
            this.prisma.business.count({ where: { kyc_status: 'PENDING', deleted_at: null } }),
            this.prisma.assessmentAttempt.count(),
            this.prisma.assessmentAttempt.aggregate({ _avg: { score: true } }),
        ]);

        const topCourseVersionIds = topCourses.map((t) => t.course_version_id);
        const courseVersions = topCourseVersionIds.length > 0
            ? await this.prisma.courseVersion.findMany({
                  where: { id: { in: topCourseVersionIds } },
                  include: { course: { select: { title: true } } },
              })
            : [];

        const courseMap = new Map(courseVersions.map((cv) => [cv.id, cv.course.title]));

        return {
            enrollmentsLast30d,
            enrollmentsLast7d,
            revenueThisMonth: revenueThisMonth._sum.amount ?? 0,
            topCourses: topCourses.map((t) => ({
                courseTitle: courseMap.get(t.course_version_id) ?? 'Unknown',
                enrollments: t._count.id,
            })),
            kycPending,
            assessmentAttempts,
            avgAssessmentScore: Math.round(avgScore._avg.score ?? 0),
        };
    }

    async getAllCertificates() {
        return this.prisma.certificate.findMany({
            where: { deleted_at: null },
            include: {
                enrollment: {
                    include: {
                        user: { select: { email: true, first_name: true, last_name: true } },
                        course_version: { include: { course: { select: { title: true } } } },
                    },
                },
            },
            orderBy: { issued_at: 'desc' },
        });
    }

    async getRecentNotifications(limit: number = 10) {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const notifications: any[] = [];

        const [recentUsers, recentBusinesses, recentEnrollments, recentPurchases] = await Promise.all([
            this.prisma.user.findMany({
                where: { created_at: { gte: since } },
                orderBy: { created_at: 'desc' },
                take: limit,
                select: { id: true, email: true, first_name: true, role: true, created_at: true },
            }),
            this.prisma.business.findMany({
                where: { created_at: { gte: since } },
                orderBy: { created_at: 'desc' },
                take: limit,
                select: { id: true, name: true, created_at: true },
            }),
            this.prisma.enrollment.findMany({
                where: { created_at: { gte: since } },
                orderBy: { created_at: 'desc' },
                take: limit,
                include: {
                    user: { select: { email: true, first_name: true } },
                    course_version: { include: { course: { select: { title: true } } } },
                },
            }),
            this.prisma.purchaseRequest.findMany({
                where: { created_at: { gte: since } },
                orderBy: { created_at: 'desc' },
                take: limit,
                select: {
                    id: true, status: true, request_type: true, created_at: true,
                    user: { select: { email: true, first_name: true } },
                    course: { select: { title: true } },
                },
            }),
        ]);

        for (const u of recentUsers) {
            notifications.push({
                id: `user-${u.id}`,
                type: 'user_created',
                message: `${u.first_name || u.email} joined as ${u.role.toLowerCase().replace('_', ' ')}`,
                createdAt: u.created_at,
            });
        }
        for (const b of recentBusinesses) {
            notifications.push({
                id: `biz-${b.id}`,
                type: 'business_created',
                message: `${b.name} registered as a business`,
                createdAt: b.created_at,
            });
        }
        for (const e of recentEnrollments) {
            notifications.push({
                id: `enroll-${e.id}`,
                type: 'enrollment',
                message: `${e.user?.first_name || e.user?.email} enrolled in ${e.course_version?.course?.title || 'a course'}`,
                createdAt: e.created_at,
            });
        }
        for (const p of recentPurchases) {
            notifications.push({
                id: `purchase-${p.id}`,
                type: 'purchase_request',
                message: `${p.user?.first_name || p.user?.email} requested to purchase ${p.course?.title || 'a course'}`,
                createdAt: p.created_at,
            });
        }

        notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return notifications.slice(0, limit);
    }
}
