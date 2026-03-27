import { Module } from '@nestjs/common';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
    imports: [CertificatesModule],
    controllers: [LearningController],
    providers: [LearningService],
    exports: [LearningService],
})
export class LearningModule {}
