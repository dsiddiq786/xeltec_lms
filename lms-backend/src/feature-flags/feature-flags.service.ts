import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeatureFlagsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        return this.prisma.featureFlag.findMany({
            where: PrismaService.notDeleted,
            orderBy: { key: 'asc' },
        });
    }

    async isEnabled(key: string): Promise<boolean> {
        const flag = await this.prisma.featureFlag.findFirst({
            where: { key, ...PrismaService.notDeleted },
        });
        return flag?.enabled ?? false;
    }

    async upsert(key: string, enabled: boolean) {
        return this.prisma.featureFlag.upsert({
            where: { key },
            update: { enabled },
            create: { key, enabled },
        });
    }

    async remove(key: string) {
        return this.prisma.featureFlag.update({
            where: { key },
            data: { deleted_at: new Date() },
        });
    }
}
