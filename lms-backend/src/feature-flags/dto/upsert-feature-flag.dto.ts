import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';

export class UpsertFeatureFlagDto {
    @IsString()
    @IsNotEmpty()
    key: string;

    @IsBoolean()
    enabled: boolean;
}
