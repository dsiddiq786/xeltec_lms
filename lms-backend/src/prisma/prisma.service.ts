import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    /**
     * Soft-delete aware findMany helper.
     * Usage: prisma.user.findMany({ where: { ...PrismaService.notDeleted } })
     */
    static get notDeleted() {
        return { deleted_at: null };
    }
}
