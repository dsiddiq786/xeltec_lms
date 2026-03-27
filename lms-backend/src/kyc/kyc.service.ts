import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SubmitKycDto, ReviewKycDto } from './dto';
import { KycStatus } from '@prisma/client';

@Injectable()
export class KycService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly storageService: StorageService,
    ) {}

    async submitOrUpdate(businessId: string, dto: SubmitKycDto) {
        const business = await this.prisma.business.findFirst({
            where: { id: businessId, ...PrismaService.notDeleted },
        });
        if (!business) throw new NotFoundException('Business not found');

        if (business.kyc_status === KycStatus.APPROVED) {
            throw new BadRequestException('KYC already approved');
        }

        const kyc = await this.prisma.businessKyc.upsert({
            where: { business_id: businessId },
            create: { business_id: businessId, ...dto },
            update: dto,
        });

        if (business.kyc_status !== KycStatus.UNDER_REVIEW) {
            await this.prisma.business.update({
                where: { id: businessId },
                data: { kyc_status: KycStatus.UNDER_REVIEW },
            });
        }

        return kyc;
    }

    async getForBusiness(businessId: string) {
        const kyc = await this.prisma.businessKyc.findUnique({
            where: { business_id: businessId },
            include: { documents: true, business: { select: { name: true, kyc_status: true } } },
        });
        return kyc;
    }

    async listPending(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const where = {
            kyc_status: { in: [KycStatus.PENDING, KycStatus.UNDER_REVIEW] as KycStatus[] },
            ...PrismaService.notDeleted,
        };
        const [businesses, total] = await Promise.all([
            this.prisma.business.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'asc' },
                include: {
                    kyc: true,
                    _count: { select: { employees: true } },
                },
            }),
            this.prisma.business.count({ where }),
        ]);
        return { data: businesses, total, page, limit };
    }

    async listAll(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const where = PrismaService.notDeleted;
        const [businesses, total] = await Promise.all([
            this.prisma.business.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: { kyc: true },
            }),
            this.prisma.business.count({ where }),
        ]);
        return { data: businesses, total, page, limit };
    }

    async uploadDocument(
        businessId: string,
        file: Buffer,
        originalName: string,
        documentType: string,
    ) {
        const kyc = await this.prisma.businessKyc.findUnique({ where: { business_id: businessId } });
        if (!kyc) throw new NotFoundException('Submit KYC details before uploading documents');

        const url = await this.storageService.upload(file, originalName, `kyc/${businessId}`);

        return this.prisma.kycDocument.create({
            data: {
                kyc_id: kyc.id,
                document_type: documentType,
                file_url: url,
                file_name: originalName,
            },
        });
    }

    async review(businessId: string, dto: ReviewKycDto, adminUserId: string) {
        const business = await this.prisma.business.findFirst({
            where: { id: businessId, ...PrismaService.notDeleted },
        });
        if (!business) throw new NotFoundException('Business not found');

        const statusMap: Record<string, KycStatus> = {
            APPROVED: KycStatus.APPROVED,
            REJECTED: KycStatus.REJECTED,
            INFO_REQUESTED: KycStatus.INFO_REQUESTED,
        };

        await this.prisma.business.update({
            where: { id: businessId },
            data: { kyc_status: statusMap[dto.decision] },
        });

        if (dto.admin_notes) {
            await this.prisma.businessKyc.upsert({
                where: { business_id: businessId },
                create: {
                    business_id: businessId,
                    admin_notes: dto.admin_notes,
                    reviewed_by: adminUserId,
                    reviewed_at: new Date(),
                },
                update: {
                    admin_notes: dto.admin_notes,
                    reviewed_by: adminUserId,
                    reviewed_at: new Date(),
                },
            });
        }

        return { message: `KYC ${dto.decision.toLowerCase()}`, business_id: businessId };
    }
}
