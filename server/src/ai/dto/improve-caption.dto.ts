import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ImproveCaptionDto {
  @ApiProperty() @IsString() @MaxLength(5000) caption: string;
  @ApiProperty() @IsIn(['improve-tone', 'add-hook']) action: 'improve-tone' | 'add-hook';
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
}
