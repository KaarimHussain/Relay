import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateIdeasDto {
  @ApiProperty() @IsString() @MaxLength(200) niche: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) pillars?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
}
