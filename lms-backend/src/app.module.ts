import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as Joi from 'joi';

// Infrastructure
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { EmailModule } from './email/email.module';
import { StorageModule } from './storage/storage.module';
import { HealthController } from './health.controller';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { BusinessModule } from './business/business.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { LearningModule } from './learning/learning.module';
import { PaymentsModule } from './payments/payments.module';
import { CertificatesModule } from './certificates/certificates.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { AdminModule } from './admin/admin.module';
import { KycModule } from './kyc/kyc.module';
import { SiteSettingsModule } from './site-settings/site-settings.module';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module';

// Filters
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    // ── Config with validation ──
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_ACCESS_TTL: Joi.number().default(900),
        JWT_REFRESH_TTL: Joi.number().default(604800),
        STRIPE_SECRET_KEY: Joi.string().required(),
        STRIPE_WEBHOOK_SECRET: Joi.string().required(),
        CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
        FRONTEND_URL: Joi.string().default('http://localhost:5173'),
        EMAIL_PROVIDER: Joi.string().valid('console', 'sendgrid', 'resend').default('console'),
        EMAIL_FROM: Joi.string().default('noreply@brickskill.com'),
        SENDGRID_API_KEY: Joi.string().optional().allow(''),
        RESEND_API_KEY: Joi.string().optional().allow(''),
        STORAGE_PROVIDER: Joi.string().valid('local', 's3').default('local'),
        STORAGE_LOCAL_DIR: Joi.string().default('./uploads'),
        S3_BUCKET: Joi.string().optional().allow(''),
        S3_REGION: Joi.string().default('eu-west-1'),
        AI_SERVICE_URL: Joi.string().default('http://localhost:8000'),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // ── Rate Limiting ──
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // ── Health Checks ──
    TerminusModule,

    // ── Infrastructure ──
    PrismaModule,
    RedisModule,
    EmailModule,
    StorageModule,

    // ── Feature Modules ──
    AuthModule,
    UsersModule,
    CoursesModule,
    BusinessModule,
    EnrollmentModule,
    LearningModule,
    PaymentsModule,
    CertificatesModule,
    FeatureFlagsModule,
    AdminModule,
    KycModule,
    SiteSettingsModule,
    PurchaseRequestsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
