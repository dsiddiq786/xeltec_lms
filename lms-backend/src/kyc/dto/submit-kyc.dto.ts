import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitKycDto {
    @ApiPropertyOptional() @IsString() @IsOptional() company_registration_number?: string;
    @ApiPropertyOptional() @IsString() @IsOptional() tax_id?: string;
    @ApiPropertyOptional() @IsString() @IsOptional() industry?: string;
    @ApiPropertyOptional() @IsString() @IsOptional() website?: string;
    @ApiPropertyOptional() @IsString() @IsOptional() address_line_1?: string;
    @ApiPropertyOptional() @IsString() @IsOptional() address_line_2?: string;
    @ApiPropertyOptional() @IsString() @IsOptional() city?: string;
    @ApiPropertyOptional() @IsString() @IsOptional() postcode?: string;
    @ApiPropertyOptional() @IsString() @IsOptional() country?: string;
    @ApiPropertyOptional() @IsString() @IsOptional() contact_first_name?: string;
    @ApiPropertyOptional() @IsString() @IsOptional() contact_last_name?: string;
    @ApiPropertyOptional() @IsString() @IsOptional() contact_email?: string;
    @ApiPropertyOptional() @IsString() @IsOptional() contact_phone?: string;
    @ApiPropertyOptional() @IsString() @IsOptional() contact_job_title?: string;
}
