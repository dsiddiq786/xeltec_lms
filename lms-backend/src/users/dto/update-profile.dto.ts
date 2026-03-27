import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    first_name?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    last_name?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    phone?: string;
}
