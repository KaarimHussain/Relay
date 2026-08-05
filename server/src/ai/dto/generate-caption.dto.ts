import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Platform } from '@prisma/client';

export class GenerateCaptionDto {
  @ApiProperty({ enum: Platform }) @IsEnum(Platform) platform: Platform;
  @ApiProperty() @IsString() @MaxLength(500) topic: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) mediaContext?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() variations?: number;
}
