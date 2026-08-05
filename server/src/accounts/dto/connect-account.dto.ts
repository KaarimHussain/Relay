import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Platform } from '@prisma/client';

export class ConnectAccountDto {
  @ApiProperty({ enum: Platform }) @IsEnum(Platform) platform: Platform;
  @ApiProperty() @IsString() platformUserId: string;
  @ApiProperty() @IsString() platformHandle: string;
  @ApiProperty() @IsString() accessToken: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() refreshToken?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() tokenExpiresAt?: string;
}
