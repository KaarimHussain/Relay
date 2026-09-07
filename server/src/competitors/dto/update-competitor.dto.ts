import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Manual edits to a competitor's benchmark numbers (platform/handle are immutable). */
export class UpdateCompetitorDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() displayName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) followerCount?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) avgLikes?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) avgComments?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Min(0) postsPerWeek?: number;
}
