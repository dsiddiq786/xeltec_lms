import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProgressDto {
    @IsInt()
    @Min(0)
    @Type(() => Number)
    level_index: number;

    @IsInt()
    @Min(0)
    @Type(() => Number)
    module_index: number;

    @IsInt()
    @Min(0)
    @Type(() => Number)
    slide_index: number;
}
