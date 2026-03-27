import { IsString, IsNotEmpty, IsEnum, IsInt, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionCycle } from '@prisma/client';

export class CreateBusinessDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEnum(SubscriptionCycle)
    billing_cycle: SubscriptionCycle;

    @IsInt()
    @Min(1)
    @Type(() => Number)
    seats_total: number;
}
