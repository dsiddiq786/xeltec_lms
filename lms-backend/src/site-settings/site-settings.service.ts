import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SiteSettingsService {
    constructor(private readonly prisma: PrismaService) {}

    async get(key: string) {
        const setting = await this.prisma.siteSetting.findUnique({ where: { key } });
        return setting?.value ?? null;
    }

    async getAll() {
        const settings = await this.prisma.siteSetting.findMany();
        const result: Record<string, any> = {};
        for (const s of settings) {
            result[s.key] = s.value;
        }
        return result;
    }

    async upsert(key: string, value: any) {
        return this.prisma.siteSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
    }

    async upsertMany(settings: Record<string, any>) {
        const ops = Object.entries(settings).map(([key, value]) =>
            this.prisma.siteSetting.upsert({
                where: { key },
                update: { value },
                create: { key, value },
            }),
        );
        return this.prisma.$transaction(ops);
    }

    async remove(key: string) {
        return this.prisma.siteSetting.delete({ where: { key } }).catch(() => null);
    }
}
