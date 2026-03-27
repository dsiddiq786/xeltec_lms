import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewKycDto {
    @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'INFO_REQUESTED'] })
    @IsEnum(['APPROVED', 'REJECTED', 'INFO_REQUESTED'])
    decision: 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED';

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    admin_notes?: string;
}
