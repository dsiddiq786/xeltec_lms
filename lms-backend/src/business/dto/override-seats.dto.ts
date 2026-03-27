import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OverrideSeatsDto {
    @IsInt()
    @Min(1)
    @Type(() => Number)
    seats_total: number;
}
