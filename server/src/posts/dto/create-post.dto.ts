import { IsArray, IsDateString, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PlatformTargetDto {
  @ApiProperty() @IsString() accountId: string;
  @ApiProperty() @IsString() caption: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hashtags?: string;
}

export class CreatePostDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) title: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) mediaIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PlatformTargetDto) targets?: PlatformTargetDto[];
}
