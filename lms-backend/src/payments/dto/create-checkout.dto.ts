import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCheckoutDto {
    @IsString()
    @IsNotEmpty()
    course_version_id: string;

    @IsString()
    @IsNotEmpty()
    success_url: string;

    @IsString()
    @IsNotEmpty()
    cancel_url: string;
}
