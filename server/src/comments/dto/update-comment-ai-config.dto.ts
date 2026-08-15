import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCommentAiConfigDto {
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isEnabled?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(1000) behaviour?: string;
}
