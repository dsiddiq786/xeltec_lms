import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { CoursesModule } from '../courses/courses.module';
import { BusinessModule } from '../business/business.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
    imports: [
        UsersModule,
        CoursesModule,
        BusinessModule,
        EnrollmentModule,
        PaymentsModule,
    ],
    controllers: [AdminController],
    providers: [AdminService],
})
export class AdminModule { }
