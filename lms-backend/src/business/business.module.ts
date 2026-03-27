import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessPublicController } from './business-public.controller';
import { BusinessService } from './business.service';

@Module({
    controllers: [BusinessPublicController, BusinessController],
    providers: [BusinessService],
    exports: [BusinessService],
})
export class BusinessModule { }
