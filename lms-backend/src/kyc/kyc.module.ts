import { Module } from '@nestjs/common';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessModule } from '../business/business.module';

@Module({
    imports: [PrismaModule, BusinessModule],
    controllers: [KycController],
    providers: [KycService],
    exports: [KycService],
})
export class KycModule {}
