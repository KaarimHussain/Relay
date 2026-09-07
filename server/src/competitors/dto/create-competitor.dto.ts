import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Platform } from '@prisma/client';

export class CreateCompetitorDto {
  @ApiProperty({ enum: Platform }) @IsEnum(Platform) platform: Platform;

  /** Public handle / username, without a leading "@". */
  @ApiProperty() @IsString() handle: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() displayName?: string;

  // Optional manual metrics — used for platforms without a public API (LinkedIn, X, TikTok, Facebook).
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) followerCount?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) avgLikes?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) avgComments?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Min(0) postsPerWeek?: number;
}
