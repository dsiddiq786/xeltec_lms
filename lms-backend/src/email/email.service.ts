import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { SiteSettingsService } from '../site-settings/site-settings.service';

interface EmailPayload {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

interface EmailSettings {
    provider?: string;
    from_address?: string;
    from_name?: string;
    templates?: Record<string, EmailTemplate>;
}

interface EmailTemplate {
    subject: string;
    body: string;
}

const DEFAULT_TEMPLATES: Record<string, EmailTemplate> = {
    email_verification: {
        subject: 'Verify your email - {{app_name}}',
        body: `<h2>Welcome to {{app_name}}!</h2>
<p>Please verify your email address by clicking the link below:</p>
<a href="{{link}}" style="{{btn_style}}">Verify Email</a>
<p style="color:#999;font-size:12px;margin-top:24px">If you didn't create an account, you can safely ignore this email.</p>`,
    },
    password_reset: {
        subject: 'Reset your password - {{app_name}}',
        body: `<h2>Password Reset</h2>
<p>Click the link below to reset your password. This link expires in 1 hour.</p>
<a href="{{link}}" style="{{btn_style}}">Reset Password</a>
<p style="color:#999;font-size:12px;margin-top:24px">If you didn't request this, you can safely ignore this email.</p>`,
    },
    employee_invite: {
        subject: "You've been invited to {{business_name}} - {{app_name}}",
        body: `<h2>You've been invited!</h2>
<p><strong>{{business_name}}</strong> has invited you to join their learning platform on {{app_name}}.</p>
<a href="{{link}}" style="{{btn_style}}">Accept Invite</a>
<p style="color:#999;font-size:12px;margin-top:24px">This invite expires in 7 days.</p>`,
    },
    purchase_approved: {
        subject: 'Purchase confirmed: {{course_title}} - {{app_name}}',
        body: `<h2>Purchase Confirmed</h2>
<p>Your purchase request for <strong>{{course_title}}</strong> has been approved.</p>
<p>You can start learning right away from your dashboard.</p>
<a href="{{dashboard_link}}" style="{{btn_style}}">Go to Dashboard</a>`,
    },
    purchase_rejected: {
        subject: 'Purchase request update - {{app_name}}',
        body: `<h2>Purchase Request Update</h2>
<p>Your purchase request for <strong>{{course_title}}</strong> was not approved.</p>
{{#admin_notes}}<p><strong>Note:</strong> {{admin_notes}}</p>{{/admin_notes}}
<p>Please contact support if you have any questions.</p>`,
    },
    certificate_earned: {
        subject: 'Certificate earned: {{course_title}} - {{app_name}}',
        body: `<h2>Congratulations! 🎉</h2>
<p>You've earned a certificate for completing <strong>{{course_title}}</strong>.</p>
<p>Certificate #: <strong>{{cert_number}}</strong></p>
<a href="{{verify_link}}" style="{{btn_style}}">View Certificate</a>`,
    },
    welcome: {
        subject: 'Welcome to {{app_name}}!',
        body: `<h2>Welcome aboard! 🚀</h2>
<p>Thank you for joining {{app_name}}. Your account has been created successfully.</p>
<p>Start exploring our courses and begin your learning journey today.</p>
<a href="{{dashboard_link}}" style="{{btn_style}}">Explore Courses</a>`,
    },
};

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly envFrom: string;
    private readonly frontendUrl: string;
    private resend: Resend | null = null;

    constructor(
        private readonly config: ConfigService,
        private readonly siteSettings: SiteSettingsService,
    ) {
        this.envFrom = this.config.get('EMAIL_FROM', 'noreply@brickskill.com');
        this.frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:5173');

        const resendKey = this.config.get('RESEND_API_KEY');
        if (resendKey) {
            this.resend = new Resend(resendKey);
        }
    }

    private async getEmailSettings(): Promise<EmailSettings> {
        try {
            const settings = await this.siteSettings.get('email_settings') as any;
            return settings || {};
        } catch {
            return {};
        }
    }

    private async getFrom(): Promise<string> {
        const settings = await this.getEmailSettings();
        const name = settings.from_name || 'brickSkill';
        const address = settings.from_address || this.envFrom;
        return `${name} <${address}>`;
    }

    private async getProvider(): Promise<string> {
        const settings = await this.getEmailSettings();
        return settings.provider || this.config.get('EMAIL_PROVIDER', 'console');
    }

    private async getTemplate(key: string): Promise<EmailTemplate> {
        const settings = await this.getEmailSettings();
        if (settings.templates?.[key]) {
            return settings.templates[key];
        }
        return DEFAULT_TEMPLATES[key] || { subject: '', body: '' };
    }

    private renderTemplate(template: string, vars: Record<string, string>): string {
        let result = template;
        for (const [key, value] of Object.entries(vars)) {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
        }
        // Handle conditional blocks: {{#key}}content{{/key}}
        result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_match, key, content) => {
            return vars[key] ? content : '';
        });
        return result;
    }

    async send(payload: EmailPayload): Promise<void> {
        const provider = await this.getProvider();
        const from = await this.getFrom();

        const fullPayload = { ...payload, from };

        if (provider === 'resend') {
            await this.sendViaResend(fullPayload);
        } else if (provider === 'sendgrid') {
            await this.sendViaSendGrid(fullPayload);
        } else {
            this.logEmail(payload);
        }
    }

    private async sendViaResend(payload: EmailPayload & { from?: string }): Promise<void> {
        if (!this.resend) {
            const key = this.config.get('RESEND_API_KEY');
            if (!key) {
                this.logger.warn('RESEND_API_KEY not set, falling back to console');
                this.logEmail(payload);
                return;
            }
            this.resend = new Resend(key);
        }

        try {
            const { error } = await this.resend.emails.send({
                from: payload.from || this.envFrom,
                to: payload.to,
                subject: payload.subject,
                html: payload.html,
            });

            if (error) {
                this.logger.error(`Resend error: ${JSON.stringify(error)}`);
            } else {
                this.logger.log(`Email sent via Resend to ${payload.to}: ${payload.subject}`);
            }
        } catch (err) {
            this.logger.error(`Resend send failed: ${err}`);
        }
    }

    private async sendViaSendGrid(payload: EmailPayload & { from?: string }): Promise<void> {
        const apiKey = this.config.get('SENDGRID_API_KEY');
        if (!apiKey) {
            this.logger.warn('SENDGRID_API_KEY not set, falling back to console');
            this.logEmail(payload);
            return;
        }

        const fromEmail = (payload.from || this.envFrom).replace(/.*<(.+)>/, '$1').trim();

        try {
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email: payload.to }] }],
                    from: { email: fromEmail },
                    subject: payload.subject,
                    content: [
                        { type: 'text/html', value: payload.html },
                    ],
                }),
            });

            if (!response.ok) {
                this.logger.error(`SendGrid error: ${response.status}`);
            } else {
                this.logger.log(`Email sent via SendGrid to ${payload.to}: ${payload.subject}`);
            }
        } catch (err) {
            this.logger.error(`SendGrid send failed: ${err}`);
        }
    }

    private logEmail(payload: EmailPayload) {
        this.logger.log(`[EMAIL] To: ${payload.to} | Subject: ${payload.subject}`);
        this.logger.debug(`[EMAIL BODY] ${payload.html.substring(0, 300)}...`);
    }

    // ── Template-based senders ────────────────────────

    private readonly btnStyle = 'display:inline-block;padding:12px 24px;background:#035A51;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;';

    private baseVars(): Record<string, string> {
        return {
            app_name: 'brickSkill',
            btn_style: this.btnStyle,
            frontend_url: this.frontendUrl,
            dashboard_link: `${this.frontendUrl}/dashboard`,
        };
    }

    async sendVerificationEmail(email: string, token: string) {
        const template = await this.getTemplate('email_verification');
        const vars = {
            ...this.baseVars(),
            link: `${this.frontendUrl}/verify-email?token=${token}`,
        };
        await this.send({
            to: email,
            subject: this.renderTemplate(template.subject, vars),
            html: this.wrap(this.renderTemplate(template.body, vars)),
        });
    }

    async sendPasswordResetEmail(email: string, token: string) {
        const template = await this.getTemplate('password_reset');
        const vars = {
            ...this.baseVars(),
            link: `${this.frontendUrl}/reset-password?token=${token}`,
        };
        await this.send({
            to: email,
            subject: this.renderTemplate(template.subject, vars),
            html: this.wrap(this.renderTemplate(template.body, vars)),
        });
    }

    async sendInviteEmail(email: string, token: string, businessName: string) {
        const template = await this.getTemplate('employee_invite');
        const vars = {
            ...this.baseVars(),
            business_name: businessName,
            link: `${this.frontendUrl}/accept-invite?token=${token}`,
        };
        await this.send({
            to: email,
            subject: this.renderTemplate(template.subject, vars),
            html: this.wrap(this.renderTemplate(template.body, vars)),
        });
    }

    async sendPurchaseConfirmation(email: string, courseTitle: string) {
        const template = await this.getTemplate('purchase_approved');
        const vars = {
            ...this.baseVars(),
            course_title: courseTitle,
        };
        await this.send({
            to: email,
            subject: this.renderTemplate(template.subject, vars),
            html: this.wrap(this.renderTemplate(template.body, vars)),
        });
    }

    async sendPurchaseRejection(email: string, courseTitle: string, adminNotes?: string) {
        const template = await this.getTemplate('purchase_rejected');
        const vars = {
            ...this.baseVars(),
            course_title: courseTitle,
            admin_notes: adminNotes || '',
        };
        await this.send({
            to: email,
            subject: this.renderTemplate(template.subject, vars),
            html: this.wrap(this.renderTemplate(template.body, vars)),
        });
    }

    async sendCertificateNotification(email: string, courseTitle: string, certNumber: string) {
        const template = await this.getTemplate('certificate_earned');
        const vars = {
            ...this.baseVars(),
            course_title: courseTitle,
            cert_number: certNumber,
            verify_link: `${this.frontendUrl}/verify/${certNumber}`,
        };
        await this.send({
            to: email,
            subject: this.renderTemplate(template.subject, vars),
            html: this.wrap(this.renderTemplate(template.body, vars)),
        });
    }

    async sendWelcomeEmail(email: string, firstName?: string) {
        const template = await this.getTemplate('welcome');
        const vars = {
            ...this.baseVars(),
            first_name: firstName || '',
        };
        await this.send({
            to: email,
            subject: this.renderTemplate(template.subject, vars),
            html: this.wrap(this.renderTemplate(template.body, vars)),
        });
    }

    private wrap(body: string): string {
        return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#212121;background:#ffffff;">
    <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-flex;align-items:center;gap:8px;">
            <span style="display:inline-block;width:36px;height:36px;border-radius:8px;background:#035A51;color:#CBFF2A;font-weight:900;font-size:16px;line-height:36px;text-align:center;">b</span>
            <span style="font-size:18px;font-weight:700;color:#1a1f25;">brickSkill</span>
        </div>
    </div>
    <div style="background:#f9fafb;border-radius:12px;padding:32px 24px;">
        ${body}
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:32px 0" />
    <p style="font-size:11px;color:#999;text-align:center">&copy; 2026 brickSkill. All rights reserved.</p>
    <p style="font-size:10px;color:#ccc;text-align:center">You're receiving this because you have an account at brickSkill.</p>
</body>
</html>`;
    }
}
