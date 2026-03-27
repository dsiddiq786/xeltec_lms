import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @ApiProperty()
    @IsString()
    current_password: string;

    @ApiProperty({ minLength: 8 })
    @IsString()
    @MinLength(8)
    new_password: string;
}
