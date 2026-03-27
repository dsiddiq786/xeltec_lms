import { Module } from '@nestjs/common';
import { PurchaseRequestsController } from './purchase-requests.controller';
import { PurchaseRequestsService } from './purchase-requests.service';
import { EnrollmentModule } from '../enrollment/enrollment.module';

@Module({
    imports: [EnrollmentModule],
    controllers: [PurchaseRequestsController],
    providers: [PurchaseRequestsService],
    exports: [PurchaseRequestsService],
})
export class PurchaseRequestsModule {}
