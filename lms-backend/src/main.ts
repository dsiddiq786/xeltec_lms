import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import * as bodyParser from 'body-parser';
import * as path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const isProd = process.env.NODE_ENV === 'production';

    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        rawBody: true,
        logger: isProd ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    }));
    app.use(compression());
    app.use(cookieParser());

    app.set('trust proxy', 1);

    app.useStaticAssets(path.join(__dirname, '..', 'uploads'), {
        prefix: '/uploads/',
    });

    app.setGlobalPrefix('api');

    const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
    const origins = corsOrigin.split(',').map((o) => o.trim());
    app.enableCors({
        origin: origins.length === 1 ? origins[0] : origins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        maxAge: 86400,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    );

    if (!isProd) {
        const swaggerConfig = new DocumentBuilder()
            .setTitle('brickSkill LMS API')
            .setDescription('Learning Management System API with AI Course Generation')
            .setVersion('1.0')
            .addBearerAuth()
            .addTag('Auth', 'Authentication and authorization')
            .addTag('Users', 'User management')
            .addTag('Courses', 'Course management')
            .addTag('Enrollment', 'Enrollment management')
            .addTag('Learning', 'Course learning and progress')
            .addTag('Payments', 'Stripe payments')
            .addTag('Certificates', 'Certificate management')
            .addTag('Business', 'Business and employee management')
            .addTag('Admin', 'Admin operations')
            .addTag('Feature Flags', 'Feature flag management')
            .addTag('Health', 'Health checks')
            .build();

        const document = SwaggerModule.createDocument(app, swaggerConfig);
        SwaggerModule.setup('api/docs', app, document);
        logger.log('Swagger docs enabled at /api/docs');
    }

    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`LMS Backend running on port ${port} [${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
}
bootstrap();
