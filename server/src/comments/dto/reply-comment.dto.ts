import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplyCommentDto {
  @ApiProperty() @IsString() text: string;
}
