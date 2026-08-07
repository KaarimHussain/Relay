import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) name: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(60)  category: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) platforms: string[];
  @ApiProperty() @IsString() @MinLength(1) caption: string;
}
