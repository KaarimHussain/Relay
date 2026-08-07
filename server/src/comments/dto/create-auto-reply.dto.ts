import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Platform } from '@prisma/client';

export class CreateAutoReplyDto {
  @ApiProperty({ enum: Platform }) @IsEnum(Platform) platform: Platform;
  @ApiProperty() @IsString() replyText: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isEnabled?: boolean;
  @ApiProperty({ required: false, enum: ['all', 'keyword'] }) @IsOptional() @IsString() triggerType?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() keywords?: string;
}
