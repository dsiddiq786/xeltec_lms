import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCourseDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @Min(0)
    @Type(() => Number)
    @IsOptional()
    base_price?: number;

    @IsNumber()
    @Min(0)
    @Type(() => Number)
    @IsOptional()
    seat_price?: number;

    @IsString()
    @IsOptional()
    thumbnail_url?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsString()
    @IsOptional()
    difficulty_level?: string;
}
