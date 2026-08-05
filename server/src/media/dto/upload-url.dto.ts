import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadUrlDto {
  @ApiProperty() @IsString() filename: string;
  @ApiProperty() @IsString() mimeType: string;
  @ApiProperty() @IsInt() @Min(1) sizeBytes: number;
  @ApiPropertyOptional() @IsOptional() @IsString() postId?: string;
}
