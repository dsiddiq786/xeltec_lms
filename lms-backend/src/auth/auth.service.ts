import {
    Injectable,
    ConflictException,
    UnauthorizedException,
    BadRequestException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, LoginDto, AcceptInviteDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { Role } from '@prisma/client';
import type { Response } from 'express';

const TOKEN_BYTES = 32;
const EMAIL_TOKEN_TTL_HOURS = 24;
const RESET_TOKEN_TTL_HOURS = 1;

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly jwtSecret: string;
    private readonly accessTokenTtl: number;
    private readonly refreshTokenTtl: number;
    private readonly isProd: boolean;
    private readonly frontendUrl: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
        private readonly redis: RedisService,
        private readonly emailService: EmailService,
    ) {
        this.jwtSecret = this.config.getOrThrow<string>('JWT_SECRET');
        this.accessTokenTtl = parseInt(String(this.config.get('JWT_ACCESS_TTL', 900)), 10);
        this.refreshTokenTtl = parseInt(String(this.config.get('JWT_REFRESH_TTL', 604800)), 10);
        this.isProd = this.config.get('NODE_ENV') === 'production';
        this.frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:5173');
    }

    // ── Register ──────────────────────────────────────────────

    async register(dto: RegisterDto, res: Response) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing) throw new ConflictException('Email already in use');

        const hash = await bcrypt.hash(dto.password, 12);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password_hash: hash,
                first_name: dto.first_name,
                last_name: dto.last_name,
                phone: dto.phone,
                role: Role.INDIVIDUAL,
            },
        });

        await this.createEmailVerificationToken(user.id, user.email);

        return this.setTokensAndRespond(user.id, user.email, user.role, res);
    }

    async registerBusiness(
        dto: { email: string; password: string; first_name?: string; last_name?: string; phone?: string; company_name: string; number_of_employees?: string },
        res: Response,
    ) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing) throw new ConflictException('Email already in use');

        const hash = await bcrypt.hash(dto.password, 12);

        const result = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: dto.email,
                    password_hash: hash,
                    first_name: dto.first_name,
                    last_name: dto.last_name,
                    phone: dto.phone,
                    role: Role.BUSINESS_ADMIN,
                },
            });

            const business = await tx.business.create({
                data: {
                    name: dto.company_name,
                    owner_id: user.id,
                    billing_cycle: 'MONTHLY',
                    seats_total: 0,
                    subscription_status: 'pending_kyc',
                    kyc_status: 'PENDING',
                },
            });

            await tx.employee.create({
                data: {
                    business_id: business.id,
                    user_id: user.id,
                    status: 'ACTIVE',
                },
            });

            return user;
        });

        await this.createEmailVerificationToken(result.id, result.email);

        return this.setTokensAndRespond(result.id, result.email, result.role, res);
    }

    // ── Login ─────────────────────────────────────────────────

    async login(dto: LoginDto, res: Response) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!user || user.deleted_at || !user.is_active) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const match = await bcrypt.compare(dto.password, user.password_hash);
        if (!match) throw new UnauthorizedException('Invalid credentials');

        return this.setTokensAndRespond(user.id, user.email, user.role, res);
    }

    // ── Admin Login (restricted to ADMIN role) ────────────────

    async adminLogin(dto: LoginDto, res: Response) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!user || user.deleted_at || !user.is_active) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (user.role !== Role.ADMIN) {
            throw new ForbiddenException('Access denied');
        }

        const match = await bcrypt.compare(dto.password, user.password_hash);
        if (!match) throw new UnauthorizedException('Invalid credentials');

        return this.setTokensAndRespond(user.id, user.email, user.role, res);
    }

    // ── Refresh ───────────────────────────────────────────────

    async refresh(refreshToken: string, res: Response) {
        if (!refreshToken) throw new UnauthorizedException('No refresh token');

        try {
            const payload: JwtPayload = this.jwt.verify(refreshToken, { secret: this.jwtSecret });

            const revoked = await this.redis.get(`revoked:${refreshToken}`);
            if (revoked) throw new UnauthorizedException('Token has been revoked');

            const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
            if (!user || !user.is_active || user.deleted_at) {
                throw new UnauthorizedException('User not found or inactive');
            }

            await this.redis.set(`revoked:${refreshToken}`, '1', this.refreshTokenTtl);

            return this.setTokensAndRespond(user.id, user.email, user.role, res);
        } catch (err) {
            if (err instanceof UnauthorizedException) throw err;
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    // ── Logout ────────────────────────────────────────────────

    async logout(refreshToken: string, res: Response) {
        if (refreshToken) {
            await this.redis.set(`revoked:${refreshToken}`, '1', this.refreshTokenTtl);
        }
        this.clearAuthCookies(res);
        return { message: 'Logged out successfully' };
    }

    // ── Get current user profile ──────────────────────────────

    async me(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
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
        if (!user) throw new UnauthorizedException('User not found');
        return user;
    }

    // ── Email Verification ────────────────────────────────────

    async verifyEmail(token: string) {
        const record = await this.prisma.emailVerificationToken.findUnique({ where: { token } });
        if (!record || record.used_at) {
            throw new BadRequestException('Invalid or expired verification token');
        }
        if (record.expires_at < new Date()) {
            throw new BadRequestException('Verification token has expired');
        }

        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: record.user_id },
                data: { email_verified: true, email_verified_at: new Date() },
            }),
            this.prisma.emailVerificationToken.update({
                where: { id: record.id },
                data: { used_at: new Date() },
            }),
        ]);

        return { message: 'Email verified successfully' };
    }

    async resendVerification(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new BadRequestException('User not found');
        if (user.email_verified) throw new BadRequestException('Email already verified');

        await this.createEmailVerificationToken(user.id, user.email);
        return { message: 'Verification email sent' };
    }

    // ── Forgot / Reset Password ───────────────────────────────

    async forgotPassword(email: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || user.deleted_at) {
            return { message: 'If that email exists, a reset link has been sent' };
        }

        const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000);

        await this.prisma.passwordResetToken.create({
            data: { user_id: user.id, token, expires_at: expiresAt },
        });

        this.emailService.sendPasswordResetEmail(email, token).catch((err) =>
            this.logger.error(`Failed to send reset email: ${err}`),
        );

        return { message: 'If that email exists, a reset link has been sent' };
    }

    async resetPassword(token: string, newPassword: string) {
        const record = await this.prisma.passwordResetToken.findUnique({ where: { token } });
        if (!record || record.used_at) {
            throw new BadRequestException('Invalid or expired reset token');
        }
        if (record.expires_at < new Date()) {
            throw new BadRequestException('Reset token has expired');
        }

        const hash = await bcrypt.hash(newPassword, 12);

        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: record.user_id },
                data: { password_hash: hash },
            }),
            this.prisma.passwordResetToken.update({
                where: { id: record.id },
                data: { used_at: new Date() },
            }),
        ]);

        return { message: 'Password reset successfully' };
    }

    // ── Accept Employee Invite ────────────────────────────────

    async acceptInvite(dto: AcceptInviteDto, res: Response) {
        const invite = await this.prisma.inviteToken.findUnique({ where: { token: dto.token } });
        if (!invite || invite.used_at) {
            throw new BadRequestException('Invalid or expired invite token');
        }
        if (invite.expires_at < new Date()) {
            throw new BadRequestException('Invite token has expired');
        }

        const hash = await bcrypt.hash(dto.password, 12);

        const user = await this.prisma.$transaction(async (tx) => {
            let existingUser = await tx.user.findUnique({ where: { email: invite.email } });

            if (existingUser) {
                existingUser = await tx.user.update({
                    where: { id: existingUser.id },
                    data: {
                        password_hash: hash,
                        first_name: dto.first_name,
                        last_name: dto.last_name,
                        email_verified: true,
                        email_verified_at: new Date(),
                        is_active: true,
                    },
                });
            } else {
                existingUser = await tx.user.create({
                    data: {
                        email: invite.email,
                        password_hash: hash,
                        first_name: dto.first_name,
                        last_name: dto.last_name,
                        role: Role.EMPLOYEE,
                        email_verified: true,
                        email_verified_at: new Date(),
                    },
                });
            }

            await tx.employee.updateMany({
                where: {
                    business_id: invite.business_id,
                    user_id: existingUser.id,
                    status: 'INVITED',
                },
                data: { status: 'ACTIVE' },
            });

            await tx.inviteToken.update({
                where: { id: invite.id },
                data: { used_at: new Date() },
            });

            return existingUser;
        });

        return this.setTokensAndRespond(user.id, user.email, user.role, res);
    }

    // ── Cookie + Token Helpers ────────────────────────────────

    private async setTokensAndRespond(
        userId: string,
        email: string,
        role: Role,
        res: Response,
    ) {
        const payload: JwtPayload = { sub: userId, email, role };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwt.signAsync(payload, { secret: this.jwtSecret, expiresIn: this.accessTokenTtl }),
            this.jwt.signAsync(payload, { secret: this.jwtSecret, expiresIn: this.refreshTokenTtl }),
        ]);

        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: this.isProd,
            sameSite: 'lax',
            path: '/',
            maxAge: this.accessTokenTtl * 1000,
        });

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: this.isProd,
            sameSite: 'strict',
            path: '/api/auth',
            maxAge: this.refreshTokenTtl * 1000,
        });

        return {
            user: { id: userId, email, role },
            expires_in: this.accessTokenTtl,
        };
    }

    private clearAuthCookies(res: Response) {
        res.clearCookie('access_token', { path: '/' });
        res.clearCookie('refresh_token', { path: '/api/auth' });
    }

    private async createEmailVerificationToken(userId: string, email: string) {
        const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
        const expiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_HOURS * 60 * 60 * 1000);

        await this.prisma.emailVerificationToken.create({
            data: { user_id: userId, token, expires_at: expiresAt },
        });

        this.emailService.sendVerificationEmail(email, token).catch((err) =>
            this.logger.error(`Failed to send verification email: ${err}`),
        );
    }
}
