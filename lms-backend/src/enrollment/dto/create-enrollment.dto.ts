import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateEnrollmentDto {
    @IsString()
    @IsNotEmpty()
    course_version_id: string;

    @IsBoolean()
    @IsOptional()
    strict_mode?: boolean;
}
