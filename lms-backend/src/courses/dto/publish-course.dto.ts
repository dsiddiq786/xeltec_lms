import { IsObject, IsNotEmpty } from 'class-validator';

export class PublishCourseDto {
    @IsObject()
    @IsNotEmpty()
    content_snapshot: Record<string, any>;
}
