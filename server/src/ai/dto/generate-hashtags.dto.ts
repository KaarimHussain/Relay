import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateHashtagsDto {
  @ApiProperty() @IsString() @MaxLength(200) topic: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
}
