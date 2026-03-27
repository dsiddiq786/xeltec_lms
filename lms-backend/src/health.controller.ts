import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
    HealthCheck,
    HealthCheckService,
    HealthIndicatorResult,
    PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private prismaHealth: PrismaHealthIndicator,
        private prisma: PrismaService,
        private redis: RedisService,
    ) {}

    @Get()
    @SkipThrottle()
    @HealthCheck()
    check() {
        return this.health.check([
            () => this.prismaHealth.pingCheck('database', this.prisma),
            async (): Promise<HealthIndicatorResult> => {
                try {
                    const pong = await this.redis.ping();
                    return { redis: { status: pong === 'PONG' ? 'up' : 'down' } };
                } catch {
                    return { redis: { status: 'down' } };
                }
            },
        ]);
    }
}
