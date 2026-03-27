import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where: PrismaService.notDeleted,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    is_active: true,
                    created_at: true,
                },
            }),
            this.prisma.user.count({ where: PrismaService.notDeleted }),
        ]);

        return { data: users, total, page, limit };
    }

    async findById(id: string) {
        const user = await this.prisma.user.findFirst({
            where: { id, ...PrismaService.notDeleted },
            select: {
                id: true,
                email: true,
                role: true,
                is_active: true,
                created_at: true,
                enrollments: {
                    where: PrismaService.notDeleted,
                    include: {
                        course_version: {
                            include: { course: { select: { title: true } } },
                        },
                    },
                },
            },
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async toggleActive(id: string) {
        const user = await this.prisma.user.findFirst({
            where: { id, ...PrismaService.notDeleted },
        });
        if (!user) throw new NotFoundException('User not found');

        return this.prisma.user.update({
            where: { id },
            data: { is_active: !user.is_active },
            select: { id: true, email: true, is_active: true },
        });
    }

    async softDelete(id: string) {
        const user = await this.prisma.user.findFirst({
            where: { id, ...PrismaService.notDeleted },
        });
        if (!user) throw new NotFoundException('User not found');

        return this.prisma.user.update({
            where: { id },
            data: { deleted_at: new Date(), is_active: false },
        });
    }

    async countByRole() {
        const counts = await this.prisma.user.groupBy({
            by: ['role'],
            where: PrismaService.notDeleted,
            _count: true,
        });
        return counts.reduce(
            (acc, { role, _count }) => {
                acc[role] = _count;
                return acc;
            },
            {} as Record<Role, number>,
        );
    }

    async updateProfile(userId: string, data: { first_name?: string; last_name?: string; phone?: string }) {
        return this.prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                phone: true,
                role: true,
                is_active: true,
                email_verified: true,
                created_at: true,
            },
        });
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string) {
        const bcrypt = await import('bcrypt');
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const match = await bcrypt.compare(currentPassword, user.password_hash);
        if (!match) {
            const { BadRequestException } = await import('@nestjs/common');
            throw new BadRequestException('Current password is incorrect');
        }

        const hash = await bcrypt.hash(newPassword, 12);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password_hash: hash },
        });

        return { message: 'Password changed successfully' };
    }

    async totalCount() {
        return this.prisma.user.count({ where: PrismaService.notDeleted });
    }
}
