import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CertificatesService {
    private readonly logger = new Logger(CertificatesService.name);

    constructor(private readonly prisma: PrismaService) {}

    async generateCertificateForUser(enrollmentId: string, userId: string) {
        const enrollment = await this.prisma.enrollment.findFirst({
            where: { id: enrollmentId, ...PrismaService.notDeleted },
            include: {
                certificate: true,
                course_version: {
                    include: { course: { select: { title: true } } },
                },
                user: { select: { id: true, email: true } },
            },
        });

        if (!enrollment) throw new NotFoundException('Enrollment not found');

        if (enrollment.user_id !== userId) {
            throw new ForbiddenException('You can only generate certificates for your own enrollments');
        }

        if (enrollment.status !== 'COMPLETED') {
            throw new BadRequestException('Cannot generate certificate for incomplete enrollment');
        }

        if (enrollment.certificate) {
            return enrollment.certificate;
        }

        const certificateNumber = this.generateCertificateNumber();

        const certificate = await this.prisma.certificate.create({
            data: {
                enrollment_id: enrollmentId,
                certificate_number: certificateNumber,
            },
        });

        this.logger.log(`Certificate ${certificateNumber} issued for enrollment ${enrollmentId}`);
        return certificate;
    }

    async generateCertificate(enrollmentId: string) {
        const enrollment = await this.prisma.enrollment.findFirst({
            where: { id: enrollmentId, ...PrismaService.notDeleted },
            include: {
                certificate: true,
                course_version: {
                    include: { course: { select: { title: true } } },
                },
                user: { select: { id: true, email: true } },
            },
        });

        if (!enrollment) throw new NotFoundException('Enrollment not found');
        if (enrollment.status !== 'COMPLETED') {
            throw new BadRequestException('Cannot generate certificate for incomplete enrollment');
        }
        if (enrollment.certificate) return enrollment.certificate;

        const certificateNumber = this.generateCertificateNumber();
        const certificate = await this.prisma.certificate.create({
            data: { enrollment_id: enrollmentId, certificate_number: certificateNumber },
        });

        this.logger.log(`Certificate ${certificateNumber} issued for enrollment ${enrollmentId}`);
        return certificate;
    }

    async verifyCertificate(certificateNumber: string) {
        const certificate = await this.prisma.certificate.findFirst({
            where: {
                certificate_number: certificateNumber,
                ...PrismaService.notDeleted,
            },
            include: {
                enrollment: {
                    include: {
                        user: { select: { email: true } },
                        course_version: {
                            include: { course: { select: { title: true } } },
                        },
                    },
                },
            },
        });

        if (!certificate) {
            return { valid: false, message: 'Certificate not found' };
        }

        return {
            valid: true,
            certificate_number: certificate.certificate_number,
            issued_at: certificate.issued_at,
            course_title: certificate.enrollment.course_version.course.title,
            holder_email: certificate.enrollment.user.email,
        };
    }

    async findByUser(userId: string) {
        return this.prisma.certificate.findMany({
            where: {
                enrollment: { user_id: userId },
                ...PrismaService.notDeleted,
            },
            include: {
                enrollment: {
                    include: {
                        course_version: {
                            include: { course: { select: { title: true } } },
                        },
                    },
                },
            },
            orderBy: { issued_at: 'desc' },
        });
    }

    async generatePdf(certificateNumber: string): Promise<Buffer> {
        const certificate = await this.prisma.certificate.findFirst({
            where: {
                certificate_number: certificateNumber,
                ...PrismaService.notDeleted,
            },
            include: {
                enrollment: {
                    include: {
                        user: { select: { email: true, first_name: true, last_name: true } },
                        course_version: {
                            include: { course: { select: { title: true } } },
                        },
                    },
                },
            },
        });

        if (!certificate) throw new NotFoundException('Certificate not found');

        const PDFDocument = (await import('pdfkit')).default;

        return new Promise<Buffer>((resolve, reject) => {
            const doc = new PDFDocument({
                size: 'A4',
                layout: 'landscape',
                margins: { top: 50, bottom: 50, left: 72, right: 72 },
            });

            const chunks: Buffer[] = [];
            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const courseTitle = certificate.enrollment.course_version.course.title;
            const user = certificate.enrollment.user;
            const holderName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
            const issuedDate = certificate.issued_at.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });

            doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).lineWidth(3).stroke('#1a365d');
            doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).lineWidth(1).stroke('#2b6cb0');

            doc.fontSize(14).fillColor('#718096').text('CERTIFICATE OF COMPLETION', 0, 70, { align: 'center' });
            doc.fontSize(36).fillColor('#1a365d').text('Certificate', 0, 100, { align: 'center' });
            doc.fontSize(14).fillColor('#4a5568').text('This certifies that', 0, 170, { align: 'center' });
            doc.fontSize(24).fillColor('#2d3748').text(holderName, 0, 200, { align: 'center' });
            doc.fontSize(14).fillColor('#4a5568').text('has successfully completed the course', 0, 250, { align: 'center' });
            doc.fontSize(22).fillColor('#2b6cb0').text(courseTitle, 0, 280, { align: 'center' });
            doc.fontSize(11).fillColor('#718096').text(`Issued on: ${issuedDate}`, 0, 350, { align: 'center' });
            doc.fontSize(10).fillColor('#a0aec0').text(`Certificate No: ${certificate.certificate_number}`, 0, 380, { align: 'center' });
            doc.fontSize(9).fillColor('#a0aec0').text(`Verify at: /api/certificates/verify/${certificate.certificate_number}`, 0, 410, { align: 'center' });

            doc.end();
        });
    }

    private generateCertificateNumber(): string {
        const prefix = 'CERT';
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = uuidv4().split('-')[0].toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }
}
