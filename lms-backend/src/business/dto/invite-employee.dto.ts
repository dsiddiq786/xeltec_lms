import { IsEmail, IsNotEmpty } from 'class-validator';

export class InviteEmployeeDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;
}
