import {
    Injectable,
    BadRequestException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentService } from '../enrollment/enrollment.service';

@Injectable()
export class PaymentsService {
    private readonly stripe: Stripe;
    private readonly webhookSecret: string;
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        private readonly config: ConfigService,
        private readonly prisma: PrismaService,
        private readonly enrollmentService: EnrollmentService,
    ) {
        this.stripe = new Stripe(
            this.config.get<string>('STRIPE_SECRET_KEY', 'sk_test_placeholder'),
            { apiVersion: '2024-12-18.acacia' as any },
        );
        this.webhookSecret = this.config.get<string>(
            'STRIPE_WEBHOOK_SECRET',
            'whsec_placeholder',
        );
    }

    // ─── Checkout Session ──────────────────────────────────────

    async createCheckoutSession(
        userId: string,
        courseVersionId: string,
        successUrl: string,
        cancelUrl: string,
    ) {
        const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:5173');
        this.validateRedirectUrl(successUrl, frontendUrl);
        this.validateRedirectUrl(cancelUrl, frontendUrl);

        const version = await this.prisma.courseVersion.findFirst({
            where: { id: courseVersionId, ...PrismaService.notDeleted },
            include: { course: true },
        });

        if (!version) throw new NotFoundException('Course version not found');

        const course = version.course;
        const price = Number(course.base_price) * 100; // cents

        if (price <= 0) {
            // Free course → enroll directly
            const enrollment = await this.enrollmentService.createEnrollment(
                userId,
                courseVersionId,
            );
            return { free: true, enrollment };
        }

        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: course.title,
                            description: course.description ?? undefined,
                        },
                        unit_amount: price,
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                user_id: userId,
                course_version_id: courseVersionId,
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
        });

        return { session_url: session.url, session_id: session.id };
    }

    // ─── Webhook Handler (Idempotent) ─────────────────────────

    async handleWebhook(rawBody: Buffer, signature: string) {
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(
                rawBody,
                signature,
                this.webhookSecret,
            );
        } catch (err) {
            this.logger.error(`Webhook signature verification failed: ${err}`);
            throw new BadRequestException('Invalid webhook signature');
        }

        // Idempotency check via unique stripe_event_id
        const existing = await this.prisma.transaction.findUnique({
            where: { stripe_event_id: event.id },
        });
        if (existing) {
            this.logger.log(`Duplicate webhook event: ${event.id}`);
            return { received: true, duplicate: true };
        }

        switch (event.type) {
            case 'checkout.session.completed':
                await this.handleCheckoutCompleted(event);
                break;

            case 'invoice.payment_failed':
                await this.handlePaymentFailed(event);
                break;

            case 'customer.subscription.updated':
                await this.handleSubscriptionUpdated(event);
                break;

            default:
                this.logger.log(`Unhandled event type: ${event.type}`);
        }

        return { received: true };
    }

    // ─── Event Handlers ────────────────────────────────────────

    private async handleCheckoutCompleted(event: Stripe.Event) {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const courseVersionId = session.metadata?.course_version_id;

        if (!userId || !courseVersionId) {
            this.logger.error('Missing metadata in checkout session');
            return;
        }

        // Create transaction record (idempotent via unique stripe_event_id)
        await this.prisma.transaction.create({
            data: {
                user_id: userId,
                stripe_session_id: session.id,
                stripe_event_id: event.id,
                amount: (session.amount_total ?? 0) / 100,
                status: 'completed',
            },
        });

        // Create enrollment ONLY after successful payment
        try {
            await this.enrollmentService.createEnrollment(userId, courseVersionId);
        } catch (err) {
            // Enrollment might already exist (idempotency)
            this.logger.warn(`Enrollment creation failed (may duplicate): ${err}`);
        }
    }

    private async handlePaymentFailed(event: Stripe.Event) {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Record the failed event
        await this.prisma.transaction.create({
            data: {
                stripe_event_id: event.id,
                amount: (invoice.amount_due ?? 0) / 100,
                status: 'failed',
            },
        });

        // Mark business subscription as past_due if subscription
        const subscriptionId = (invoice as any).subscription;
        if (subscriptionId) {
            // Find business by stripe customer (would need a stripe_customer_id field,
            // for now log it)
            this.logger.warn(
                `Payment failed for customer ${customerId}, subscription ${subscriptionId}`,
            );
        }
    }

    private async handleSubscriptionUpdated(event: Stripe.Event) {
        const subscription = event.data.object as Stripe.Subscription;

        await this.prisma.transaction.create({
            data: {
                stripe_event_id: event.id,
                amount: 0,
                status: subscription.status,
            },
        });

        this.logger.log(
            `Subscription ${subscription.id} updated to status: ${subscription.status}`,
        );
    }

    // ─── Admin Queries ─────────────────────────────────────────

    async findAllTransactions(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where: PrismaService.notDeleted,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    user: { select: { id: true, email: true } },
                    business: { select: { id: true, name: true } },
                },
            }),
            this.prisma.transaction.count({ where: PrismaService.notDeleted }),
        ]);
        return { data: transactions, total, page, limit };
    }

    async totalRevenue() {
        const result = await this.prisma.transaction.aggregate({
            where: { status: 'completed', ...PrismaService.notDeleted },
            _sum: { amount: true },
        });
        return Number(result._sum.amount ?? 0);
    }

    private validateRedirectUrl(url: string, allowedOrigin: string) {
        try {
            const parsed = new URL(url);
            const allowed = new URL(allowedOrigin);
            if (parsed.origin !== allowed.origin) {
                throw new BadRequestException('Redirect URL must match the application origin');
            }
        } catch (err) {
            if (err instanceof BadRequestException) throw err;
            throw new BadRequestException('Invalid redirect URL');
        }
    }
}
