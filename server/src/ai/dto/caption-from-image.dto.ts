import { IsEnum, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Platform } from '@prisma/client';

export class CaptionFromImageDto {
  @ApiProperty() @IsUrl() imageUrl: string;
  @ApiPropertyOptional({ enum: Platform }) @IsOptional() @IsEnum(Platform) platform?: Platform;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) extraContext?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
}
