import { IsHexColor, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBrandDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(60) name: string;
  @ApiPropertyOptional() @IsOptional() @IsHexColor() colorHex?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) voiceTone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) pillars?: string;
}
