import { IsArray, ValidateNested, IsString, IsInt, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class AnswerDto {
    @ApiProperty({ description: 'Question identifier' })
    @IsString()
    question_id: string;

    @ApiProperty({ description: 'Selected option index (0-based)' })
    @IsInt()
    @Min(0)
    selected_option: number;
}

export class SubmitAssessmentDto {
    @ApiProperty({ type: [AnswerDto], description: 'Array of question answers' })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => AnswerDto)
    answers: AnswerDto[];
}
